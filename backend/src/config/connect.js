import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg; 

const useSsl = process.env.DB_SSL !== 'false';

const con = new Pool({
    ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '123456',
        database: process.env.DB_NAME || 'flowse_enterprise',
        port: parseInt(process.env.DB_PORT || '5432', 10),
    }),
    max: 20, 
    idleTimeoutMillis: 30000, 
    connectionTimeoutMillis: 10000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
});

con.connect((err, client, release) => {
    if (err) {
        return console.error('Lỗi kết nối tới PostgreSQL:', err.stack);
    }
    console.log("Connected to PostgreSQL successfully via Pool!");
    release();
});

// DB_SCHEMA (chỉ dùng khi test): mọi truy vấn chạy trong schema riêng, không chạm dữ liệu ở public
const schema = process.env.DB_SCHEMA;
if (schema) {
    if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error('DB_SCHEMA không hợp lệ');
    con.on('connect', (client) => client.query(`SET search_path TO ${schema}, extensions`));
}

con.on('error', (err) => {
    console.error('Cảnh báo ngắt kết nối tạm thời từ PostgreSQL (idle client):', err.message);
});

export default con;
