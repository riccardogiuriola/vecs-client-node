import net from "net";
import { EventEmitter } from "events";

// --- Tipi ---

export interface VecsOptions {
  host?: string;
  port?: number;
  timeout?: number;
}

interface RequestTask {
  resolve: (value: string | null) => void;
  reject: (reason?: any) => void;
}

// --- Client ---

export class VecsClient extends EventEmitter {
  private host: string;
  private port: number;
  private socket: net.Socket | null = null;
  private queue: RequestTask[] = [];
  private buffer: Buffer = Buffer.alloc(0);
  private isConnected: boolean = false;

  constructor(options: VecsOptions = {}) {
    super();
    this.host = options.host || "127.0.0.1";
    this.port = options.port || 6379;
  }

  /**
   * Connette al server Vex.
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected) return resolve();

      this.socket = new net.Socket();

      this.socket.connect(this.port, this.host, () => {
        this.isConnected = true;
        this.emit("connect");
        resolve();
      });

      this.socket.on("data", (chunk: Buffer) => {
        this.handleData(chunk);
      });

      this.socket.on("error", (err: Error) => {
        this.emit("error", err);
        // Rifiuta la richiesta corrente se esiste
        if (this.queue.length > 0) {
          const task = this.queue.shift();
          task?.reject(err);
        }
      });

      this.socket.on("close", () => {
        this.isConnected = false;
        this.emit("close");
        this.socket = null;
      });
    });
  }

  /**
   * Chiude la connessione.
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
      this.isConnected = false;
    }
  }

  /**
   * Comando generico (basso livello).
   */
  private sendCommand(
    command: string,
    ...args: (string | object)[]
  ): Promise<string | null> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.isConnected) {
        return reject(new Error("VecsClient: Socket not connected"));
      }

      // Encoding VSP: *<num_args>\r\n$<len>\r\n<arg>\r\n...
      const allArgs = [command, ...args];
      let payload = `*${allArgs.length}\r\n`;

      for (const arg of allArgs) {
        let argStr: string;

        if (typeof arg === "object" && arg !== null) {
          argStr = JSON.stringify(arg);
        } else {
          argStr = String(arg);
        }

        // Calcolo lunghezza in BYTE (fondamentale per UTF-8)
        const byteLen = Buffer.byteLength(argStr, "utf8");
        payload += `$${byteLen}\r\n${argStr}\r\n`;
      }

      this.queue.push({ resolve, reject });
      this.socket.write(payload);
    });
  }

  // --- API Pubblica ---

  /**
   * Inserisce un dato nella cache (L1 + L2).
   * @param prompt - La frase o domanda.
   * @param params - Oggetto metadati (es. { user_id: 1 }).
   * @param response - La risposta da cacheare.
   */
  public async set(
    prompt: string,
    params: Record<string, any>,
    response: string
  ): Promise<string> {
    const res = await this.sendCommand("SET", prompt, params, response);
    if (res !== "OK") {
      throw new Error(`Vecs SET Error: ${res}`);
    }
    return res;
  }

  /**
   * Cerca nella cache.
   * @param prompt - La frase da cercare.
   * @param params - Oggetto metadati.
   * @returns La risposta trovata o null se MISS.
   */
  public async query(
    prompt: string,
    params: Record<string, any> = {}
  ): Promise<string | null> {
    return await this.sendCommand("QUERY", prompt, params);
  }

  /**
   * Rimuove un dato dalla cache (L1 e L2).
   * @param prompt - La frase da rimuovere.
   * @param params - Oggetto metadati (deve corrispondere a quello usato nel SET).
   */
  public async delete(
    prompt: string,
    params: Record<string, any> = {}
  ): Promise<boolean> {
    const res = await this.sendCommand("DELETE", prompt, params);
    return res === "OK";
  }

  // --- Parsing VSP Protocol ---

  private handleData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const result = this.parseResponse();
      if (result === undefined) break; // Dati incompleti

      const task = this.queue.shift();
      if (task) {
        if (result instanceof Error) {
          task.reject(result);
        } else {
          task.resolve(result);
        }
      }
    }
  }

  private parseResponse(): string | null | Error | undefined {
    if (this.buffer.length === 0) return undefined;

    const crlfIndex = this.buffer.indexOf("\r\n");
    if (crlfIndex === -1) return undefined;

    const line = this.buffer.subarray(0, crlfIndex).toString("utf8");
    const type = line[0];
    const content = line.slice(1);

    // Simple String (+OK)
    if (type === "+") {
      this.consume(crlfIndex + 2);
      return content;
    }

    // Error (-ERR ...)
    if (type === "-") {
      this.consume(crlfIndex + 2);
      return new Error(content);
    }

    // Bulk String ($<len>\r\n<data>\r\n)
    if (type === "$") {
      const dataLen = parseInt(content, 10);

      // Null Bulk String ($-1) -> Cache Miss
      if (dataLen === -1) {
        this.consume(crlfIndex + 2);
        return null;
      }

      // Check se abbiamo tutto il body + CRLF finale
      const totalNeeded = crlfIndex + 2 + dataLen + 2;
      if (this.buffer.length < totalNeeded) return undefined;

      const dataStart = crlfIndex + 2;
      const dataEnd = dataStart + dataLen;
      const data = this.buffer.subarray(dataStart, dataEnd).toString("utf8");

      this.consume(totalNeeded);
      return data;
    }

    // Protocollo rotto o disallineato
    this.consume(this.buffer.length);
    return new Error(`Protocol Error: Unknown type '${type}'`);
  }

  private consume(n: number): void {
    this.buffer = this.buffer.subarray(n);
  }
}
