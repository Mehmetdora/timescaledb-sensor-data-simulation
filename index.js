import { Client } from "pg";

// PostgreSQL bağlantı ayarları
const client = new Client({
  host: "localhost",
  port: 5432,
  user: "mehmetdora", // kendi kullanıcı adını yaz
  password: "", // kendi şifreni yaz
  database: "timescale_playground", // kendi veritabanını yaz
});

async function main() {
  try {
    await client.connect();
    console.log("✅ PostgreSQL bağlantısı başarılı!");

    // 1) Tablo oluşturma
    /* await client.query(`
      CREATE TABLE IF NOT EXISTS deneme (
        time TIMESTAMPTZ NOT NULL,
        sensor_id INT NOT NULL,
        value DOUBLE PRECISION
      );
    `); */

    // Tablo kaldırma
    await client.query(`DROP TABLE IF EXISTS deneme;`);

    // 2) Hypertable oluşturma (Timescale)
    /* await client.query(`
      SELECT create_hypertable('sensor_data', 'time', if_not_exists => TRUE);
    `); */

    // 3) Örnek veri ekleme
    /* await client.query(`
      INSERT INTO sensor_data (time, sensor_id, value)
      VALUES (NOW(), 1, 25.3);
    `); */

    // 4) Veri çekme
    /* const res = await client.query("SELECT * FROM sensor_data LIMIT 5;");
    console.log("📊 Sonuçlar:", res.rows);
    */ 
  

  } catch (err) {
    console.error("❌ Hata:", err);
  } finally {
    await client.end();
  }
}

main();

console.log("ffff");
