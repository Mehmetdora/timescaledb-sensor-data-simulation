import { Client } from "pg";
import * as func from "./functions.js"; // gerekli fonksiyonlar

// PostgreSQL bağlantı ayarları
const client = new Client({
  host: "localhost",
  port: 5432,
  user: "mehmetdora", // kendi kullanıcı adını yaz
  password: "", // kendi şifreni yaz
  database: "timescale_playground", // kendi veritabanını yaz
});

// Tabloları kaldır
async function drop_tables() {
  var start_time = Date.now();
  await func.drop_sensors_table(client);
  console.log(
    "Sensors tablo kaldırma süresi:",
    (Date.now() - start_time) / 1000,
    "sn"
  );

  start_time = Date.now();
  await func.drop_sensor_data_table(client);
  console.log(
    "Sensor Data tablo kaldırma süresi:",
    (Date.now() - start_time) / 1000,
    "sn"
  );
}

// Tabloları oluştur
async function create_tables() {
  var start_time = Date.now();
  await func.create_sensors_table(client);
  console.log(
    "Sensors tablo oluşturma süresi:",
    (Date.now() - start_time) / 1000,
    "sn"
  );

  start_time = Date.now();
  await func.create_sensor_data_table(client);
  console.log(
    "Sensor Data tablo oluşturma süresi:",
    (Date.now() - start_time) / 1000,
    "sn"
  );
}

async function main() {
  console.log("----> Proğram başladı.");

  try {
    await func.connect_db(client);

    // Önceki tabloları kaldırma , hata olmasın diye
    await drop_tables();

    
    // 1) Tabloların oluşturulması
    await create_tables();

    // 2) Verilerin oluşturulması
    //  '14 days',  '7 days'
    var start_time = Date.now();
    await func.insert_sensors_table(client);
    console.log(
      "Sensors tablosuna veri ekleme süresi:",
      (Date.now() - start_time) / 1000,
      "sn"
    );

    start_time = Date.now();
    await func.insert_sensor_data_table(client, `2 hours`, `1 hours`);
    console.log(
      "Sensor Data tablosuna veri ekleme süresi:",
      (Date.now() - start_time) / 1000,
      "sn"
    );

    // Tablo kaldırma
    //drop_tables();



  } catch (err) {
    console.error("❌ Hata:", err);
  } finally {
    await client.end();
    console.log("PostgreSQL bağlantısı kapatıldı.");
  }
}

await main();

console.log("----> Proğram sonlandı.");
