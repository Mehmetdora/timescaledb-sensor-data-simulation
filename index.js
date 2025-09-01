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

// sensor_data tablosuna veri ekleme ve sonrasında hemen sıkıştırma
async function insert_and_compress(start_time, end_time) {
  try {
    await client.query("BEGIN");

    // alınan tarihler için verileri ekle - sıkıştır
    console.log(
      `Sensor Data tablosuna ${start_time} - ${end_time} arası için veriler ekleniyor...`
    );
    var start = Date.now();
    await func.insert_sensor_data_table(client, start_time, end_time);
    console.log(
      `Sensor Data tablosuna ${start_time} - ${end_time} arası veri ekleme süresi:`,
      (Date.now() - start) / 1000,
      "sn"
    );

    var size = await func.get_sensor_data_table_size(client);
    console.log("----> sensor_data tablo boyutu (sıkıştırmadan önce):", size);

    // veriler eklendikten sonra oluşan sıkıştırılmamış chunk'ları al
    const uncompressed_chunk_names = await func.get_uncompressed_chunk_names(
      client
    );

    // sıkıştır
    console.log("Yeni eklenen verilerin chunk'ları sıkıştırılıyor...");
    await func.compress_chunks(client, uncompressed_chunk_names);
    console.log("Yeni eklenen chunk'lar sıkıştırıldı.");

    size = await func.get_sensor_data_table_size(client);
    console.log("----> sensor_data tablo boyutu (sıkıştırmadan sonra):", size);

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.log("@@@@@-> Hata:", err, "\n");
  }
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
    console.log("Sensors verileri ekleniyor...");
    await func.insert_sensors_table(client);
    console.log(
      "Sensors tablosuna veri ekleme süresi:",
      (Date.now() - start_time) / 1000,
      "sn"
    );

    /*  
      Verileri ilk seferde bir kereliğine ayrı olarak eklenir ki veriler eklendikten sonra hypertable yapalım
      Sonrasında veriler insert_and_compress fonksiyonu ile ard arda eklenip hemen sıkıştırılacak

    */
    start_time = Date.now();
    console.log("sensors_data verileri ekleniyor...");
    await func.insert_sensor_data_table(client, `15 minutes`, `5 minutes`);
    console.log(
      "sensor_data tablosuna deneme verileri eklendi: ",
      (Date.now() - start_time) / 1000,
      "sn"
    );

    // veriler eklendikten sonra verileri hypertable haline getir
    // ilk eklemeden sonra bunu yap , sonraki eklemelerde yapılmaz
    console.log("sensor_data tablosu hypertable yapılıyor...");
    await func.table_to_hypertable(client);

    // chunk sıkıştırma ayarlarını bir kereliğine yap
    await func.compression_settings(client);

    // tablo hypertable yapıldıktan sonra ve sıkıştırma ayarları yapıldıktan sonra verileri ard arda ekle ve hemen sıkıştır

    console.log(
      "sensor_data tablosuna ard arda veriler eklenip sıkıştırılıyor..."
    );
    await insert_and_compress(`7 days`, `1 hours`);
    await insert_and_compress(`14 days`, `7 days`);
    await insert_and_compress(`21 days`, `14 days`);
    await insert_and_compress(`28 days`, `21 days`);
    /* await insert_and_compress(`35 days`, `28 days`);
    await insert_and_compress(`42 days`, `35 days`);
    await insert_and_compress(`49 days`, `42 days`);
    await insert_and_compress(`56 days`, `49 days`); */

    // hypertable yapıldıktan sonra oluşan chunk isimlerini al
    /* const all_chunk_names = await func.get_chunk_names(client);
    const uncompressed_chunk_names = await func.get_uncompressed_chunk_names(
      client
    ); */

    // sıkıştırma sonrası tablo boyutu
    var size = await func.get_sensor_data_table_size(client);
    console.log(
      "----> sensor_data tablo boyutu (bütün veri eklenip sıkıştırıldıktan sonra):",
      size
    );

    console.log("----> Chunk boyutları (son durumda):");
    await func.get_sensor_data_chunks_size(client);

    const database_size = await func.get_database_size(client);
    console.log("----> Database boyutu:", database_size);

    start_time = Date.now();
    const result = await func.select_sensor_data_table(client);
    console.log(
      "sensor_data tablosundan sorgu süresi:",
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

/* 

Notlarım :

- Sıkıştırma işleminden önce  1 günlük chunk verisi 700-800 MB arasında yer kaplıyor,
sıkıştırma işleminden sonra bu değer 16 KB a düşüyor. 

- Tablo hypertable yapıldıktan sonra sıkıştırılmadan düz bir şekilde sorgu yapıldığuında bile
sorgunun süresi 5-6 saniyeye düşüyor. Sıkıştırma sonrası  bu süre 1-2 saniyeye kadar iniyor ki sıkıştırılmadan 
önce sorgulanan veri miktarı 1 haftalık veri iken sıkıştırılmış veri üzerinde yapılan sorgudaki veri miktarı
sonra 3 haftalık veri.

- Normalde veriler eğer 1 yıllık veri eklenip sonrasında sıkıştırma işlemi yapılacak olursa
bu işlem çok uzun sürecek hemde çok büyük disk alanı kaplayacak. Bunun yerine verileri 1 haftalık periyotlar ile
hem ekleyip hemen arkasından sıkıştırarak bilgisayarın diski dolmadan veriler sıkıştırılarak saklanabiliyor. 

- yine eğer verileri sıkıştırmadan sadece hypertable yapıp genel database boyutuna bakarsak 1 haftalık 
sıkıştırılmamış veri 5-6 gb yer kaplıyor. Sıkıştırma sonrasında ise 3 haftalık veri ile tüm database 
boyutu 1-2 gb a geliyor. 

- 13-14 sn de 4 haftalık veri üzerinde sorgu yapılıyor( veritabanı boyutu 7-8 gb).


*/
