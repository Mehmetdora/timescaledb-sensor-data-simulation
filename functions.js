export const connect_db = async (client) => {
  try {
    await client.connect();
    console.log("----> PostgreSQL bağlantısı başarılı!");
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
};




// SENSORS TABLOSU

export async function create_sensors_table(client) {
  try {
    await client.query("BEGIN");

    const result = await client.query(`
            CREATE TABLE IF NOT EXISTS sensors (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL
            );
        `);

    await client.query("COMMIT");
    console.log("----> sensors tablosu oluşturuldu!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensors tablosu oluşturulurken hata:", err);
  }
}
export async function drop_sensors_table(client) {
  try {
    await client.query("BEGIN");
    const result = await client.query(`DROP TABLE IF EXISTS sensors;`);
    await client.query("COMMIT");
    console.log("----> sensors tablosu kaldırıldı!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensors tablosu kaldırılırken hata:", err);
  }
}
// 100 tane sensör ekler
export async function insert_sensors_table(client) {
  try {
    await client.query("BEGIN");
    const result = await client.query(`
        INSERT INTO sensors (name)
        SELECT 'Sensor_' || g
        FROM generate_series(1, 100) g;
    `);
    await client.query("COMMIT");
    console.log("----> sensors tablosuna örnek veriler eklendi!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensors verisi eklenirken hata:", err);
  }
}
export const select_sensors_table = ``;






// SENSOR_DATA TABLOSU

// hypertable kullanabilmek için time kolonu composite key içerisinde yer almalı
export async function create_sensor_data_table(client) {
  try {
    await client.query("BEGIN");
    const result = await client.query(`
        CREATE TABLE sensor_data (
            sensor_id INT NOT NULL,
            reading_time TIMESTAMPTZ NOT NULL,
            temp DOUBLE PRECISION NOT NULL,
            PRIMARY KEY (sensor_id, reading_time)  
        );
    `);
    await client.query("COMMIT");
    console.log("----> sensor_data tablosu oluşturuldu!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensor_data tablosu oluşturulurken hata:", err);
  }
}
export async function drop_sensor_data_table(client) {
  try {
    await client.query("BEGIN");
    const result = await client.query(`DROP TABLE IF EXISTS sensor_data;`);
    await client.query("COMMIT");
    console.log("----> sensor_data tablosu kaldırıldı!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensor_data tablosu kaldırılırken hata:", err);
  }
}

/* 
    Her sensor için başlangıç ve bitiş zamanı arasında 1 saniye aralıklarla
    rasgele sıcaklık değerleri ekler.
*/
export async function insert_sensor_data_table(client, start_time, end_time) {
  try {
    await client.query("BEGIN");
    const result = await client.query(`
        INSERT INTO sensor_data (sensor_id, reading_time, temp)
        SELECT
        s.id,                          
        t,                             
        round((15 + random()*15)::Numeric, 2)     
        FROM sensors s
        CROSS JOIN generate_series(		 
        now() - interval '${start_time}',    
        now() - interval '${end_time}', 						
        interval '1 second'           
        ) AS t;
    `);
    await client.query("COMMIT");
    console.log("----> sensor_data tablosuna örnek veriler eklendi!");
    console.log("----> result:", result);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensor_data verisi eklenirken hata:", err);
  }
}

export const select_sensor_data_table = ``;
