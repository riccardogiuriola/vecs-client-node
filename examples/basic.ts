import { VecsClient } from "../src/index";

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const vecs = new VecsClient({ port: 6380 });

  vecs.on("error", (err) => console.error("🔴 Client Error:", err));

  try {
    console.log("🔌 Connessione...");
    await vecs.connect();
    console.log("✅ Connesso a Vecs!");

    // 1. SET STANDARD
    const prompt = "Come resetto la password?";
    const response = "Vai su Impostazioni > Sicurezza > Reset.";

    console.log(`\n📝 SET (Default TTL): "${prompt}"`);
    await vecs.set(prompt, { category: "support" }, response);

    // 2. SET CON TTL
    const tempPrompt = "Offerta lampo";
    const tempResponse = "Sconto del 50% solo per oggi!";
    const ttlSeconds = 2;

    console.log(`\n⏱️  SET con TTL (${ttlSeconds}s): "${tempPrompt}"`);
    await vecs.set(tempPrompt, {}, tempResponse, ttlSeconds);

    // 3. QUERY IMMEDIATA (Deve esistere)
    console.log(`🔍 QUERY Immediata: "${tempPrompt}"`);
    const immediateRes = await vecs.query(tempPrompt);
    console.log(`   -> ${immediateRes ? "✅ TROVATO" : "❌ ERRORE"}`);

    // 4. ATTESA SCADENZA
    console.log(`⏳ Attendo ${ttlSeconds + 1} secondi...`);
    await wait((ttlSeconds + 1) * 1000);

    // 5. QUERY DOPO SCADENZA (Deve essere NULL)
    console.log(`🔍 QUERY Post-Scadenza: "${tempPrompt}"`);
    const expiredRes = await vecs.query(tempPrompt);
    console.log(
      `   -> ${
        expiredRes === null
          ? "✅ SCADUTO CORRETTAMENTE (MISS)"
          : "❌ ERRORE: ANCORA PRESENTE"
      }`
    );
  } catch (err) {
    console.error("Ops:", err);
  } finally {
    vecs.disconnect();
  }
}

main();
