import { VecsClient } from "../src/index";

async function main() {
  const vecs = new VecsClient({ port: 6379 });

  vecs.on("error", (err) => console.error("🔴 Client Error:", err));

  try {
    console.log("🔌 Connessione...");
    await vecs.connect();
    console.log("✅ Connesso a Vex!");

    // 1. SET
    const prompt = "Come resetto la password?";
    const response = "Vai su Impostazioni > Sicurezza > Reset.";

    console.log(`\n📝 SET: "${prompt}"`);
    const setRes = await vecs.set(prompt, { category: "support" }, response);
    console.log(`   -> ${setRes}`); // Dovrebbe stampare "OK"

    // 2. QUERY L1 (Esatta)
    console.log(`\n🔍 QUERY L1 (Identica): "${prompt}"`);
    const l1Res = await vecs.query(prompt, { category: "support" });
    console.log(`   -> HIT: "${l1Res}"`);

    // 3. QUERY L2 (Semantica)
    const semanticPrompt = "Ho dimenticato la password, come faccio?";
    console.log(`\n🧠 QUERY L2 (Semantica): "${semanticPrompt}"`);
    const l2Res = await vecs.query(semanticPrompt, { category: "support" });

    if (l2Res) {
      console.log(`   -> ✅ HIT SEMANTICO: "${l2Res}"`);
    } else {
      console.log(`   -> ❌ MISS (Score basso?)`);
    }

    // 4. QUERY MISS
    const missPrompt = "Qual è la capitale del Perù?";
    console.log(`\n❌ QUERY MISS: "${missPrompt}"`);
    const missRes = await vecs.query(missPrompt);
    console.log(
      `   -> Result: ${missRes === null ? "NULL (Corretto)" : missRes}`
    );
  } catch (err) {
    console.error("Ops:", err);
  } finally {
    vecs.disconnect();
  }
}

main();
