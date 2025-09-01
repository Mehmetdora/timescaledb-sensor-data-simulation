export const connect_db = async (client) => {
  try {
    await client.connect();
    console.log("----> PostgreSQL bağlantısı başarılıı!");
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
};

export async function get_sensor_data_table_size(client) {
  try {
    const result = await client.query(`
        
        SELECT pg_size_pretty(pg_total_relation_size('sensor_data'));
      
      `);
    return result.rows[0].pg_size_pretty;
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function get_database_size(client) {
  try {
    const result = await client.query(`
        
        SELECT pg_size_pretty(pg_database_size('timescale_playground'));
      
      `);
    return result.rows[0].pg_size_pretty;
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function get_sensor_data_chunks_size(client) {
  try {
    const result = await client.query(`
        
        SELECT chunk_name, pg_size_pretty(pg_total_relation_size(chunk_name::regclass)) AS size
        FROM show_chunks('sensor_data') AS chunk_name;      
     
      `);
    console.table(result.rows);
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function table_to_hypertable(client) {
  try {
    // tablo oluşturulduktan sonra ilk veri eklenmeden sonra hypertable yap
    // veriler 7 günlük chunklara ayrılacak

    //migrate_data : eğer bir tablo önceden oluşturulmuş ve veri eklenmişse bu verilerin uygun chunklara taşınmasını sağlar. 

    const result = await client.query(`
        SELECT create_hypertable(
            'sensor_data',
            'reading_time',
            migrate_data => true,
            chunk_time_interval => INTERVAL '4 days'
        );      
      `);
    console.log("----> tablo hypertable yapıldı!");
    console.log("----> result:", result, "\n");
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function compression_settings(client) {
  try {
    //segmentby değeri verinin hangi kolonuna göre gruplanacağını belirler, veriler hangi kolon üzerinde dağılıyorsa bu kolon seçilmelidir.
    // orderby ile verilerin sıkıştırma yapılırken hangi sıraya göre nasıl yapılacağını belirler.

    // veriler sensörler üzerinde dağıldığı için sensor_id kolonu segmentby olarak seçilmiştir.
    const result = await client.query(`
        ALTER TABLE sensor_data SET (
          timescaledb.compress = true,
          timescaledb.compress_segmentby = 'sensor_id',
          timescaledb.compress_orderby = 'reading_time DESC'
        );
      `);
    console.log("----> compression ayarları yapıldı!");
    console.log("----> result:", result, "\n");
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function get_chunk_names(client) {
  try {
    const result = await client.query(`
      
      SELECT chunk_schema || '.' || chunk_name AS chunk_full_name
      FROM timescaledb_information.chunks
      WHERE hypertable_name = 'sensor_data'
      ORDER BY range_start;

      
      `);
    console.log("----> chunk isimleri alındı!");
    console.log("----> result:", result, "\n");

    return result.rows;
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function compress_chunks(client, chunk_names) {
  try {
    // Her chunk için sıkıştırma işlemi yap
    for (const chunk_name of chunk_names) {
      console.log(`----> ${chunk_name} sıkıştırılıyor...`);
      const result = await client.query(`
        SELECT compress_chunk('${chunk_name}');
      `);
      console.log(`----> ${chunk_name} sıkıştırıldı!`);
    }

    console.log("----> Tüm chunklar sıkıştırıldı!");
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}

export async function get_uncompressed_chunk_names(client) {
  try {
    const result = await client.query(`
      
        SELECT chunk_schema || '.' || chunk_name AS chunk_full_name,
              is_compressed
        FROM timescaledb_information.chunks
        WHERE hypertable_name = 'sensor_data';

      `);

    var uncompressed_chunks = [];
    for (const chunk of result.rows) {
      if (!chunk.is_compressed) {
        uncompressed_chunks.push(chunk.chunk_full_name);
      }
    }
    console.log("----> Sıkıştırılmamış chunk isimleri alındı!");
    console.log("----> uncompressed_chunks:", uncompressed_chunks, "\n");
    return uncompressed_chunks;
  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
  }
}







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
    console.log("----> sensor_data tablosuna ilgili veriler eklendi!");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("@@@@-> sensor_data verisi eklenirken hata:", err);
  }
}

export async function select_sensor_data_table(client) {

  try {
    
    /* 
     WHERE
            "reading_time" >= CURRENT_DATE - INTERVAL '3 days'
    */


    const result = await client.query(`
      
        SELECT
            sensor_id,
            AVG(temp) AS average_temperature,
            MIN(temp) AS min_temperature,
            MAX(temp) AS max_temperature
        FROM sensor_data
        GROUP BY sensor_id 
        ORDER BY sensor_id; 
      
      `);
    console.log("----> sensor_data tablosundan veriler alındı!");
    console.table(result.rows);
    return result.rows;



  } catch (err) {
    console.log("\n@@@@@-> Hata:", err, "\n");
    
  }


}
