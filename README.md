# TimescaleDB Sensor Data Simulation

This project simulates **100 IoT sensors** generating time-series data every second for one year, 
and stores the data in **TimescaleDB** using hypertables and chunks.  
It is designed to **test performance, chunking strategies, and compression** in TimescaleDB.

---

## 🚀 Project Goals
- Generate **synthetic sensor data** (100 sensors, per-second values for one year).
- Store the data in **TimescaleDB hypertables**.
- Experiment with **chunk creation** (time-based and space-based).
- Apply **compression** on historical chunks(it is to much - 264 GB data for 1 year).
- Run performance tests on **querying compressed and uncompressed data**.
- Learn how TimescaleDB handles **large-scale IoT datasets**.

---

## 🛠️ Tech Stack
- **PostgreSQL 17**
- **TimescaleDB**

---

## 📊 Example Queries
- Retrieve data for a single sensor over time.
- Aggregate daily average values across all sensors.
- Compare query performance **before vs after compression**.
- Test chunk creation policies with different intervals.
