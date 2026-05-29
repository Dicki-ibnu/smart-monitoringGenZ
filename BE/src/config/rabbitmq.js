const amqp = require('amqplib');

let channel;
let connection; 

const connectRabbitMQ = async () => {
    try {
        connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost');
        channel = await connection.createChannel();
        await channel.assertQueue('ocr_tasks', { durable: true });
        console.log('RabbitMQ Connected Dan Queue Ready!');

        connection.on('error', (err) => {
            console.error('Koneksi RabbitMQ error mendadak:', err.message);
        });

        // 2. Kalau koneksi diputus paksa, coba reconnect otomatis
        connection.on('close', () => {
            console.error('RabbitMQ terputus! Mencoba nyambung ulang dalam 5 detik...');
            setTimeout(connectRabbitMQ, 5000);
        });
        // ------------------------------------------------

    } catch (error) {
        console.error('RabbitMQ Gagal Konek:', error.message);
        setTimeout(connectRabbitMQ, 5000);
    }
};

const sendToQueue = (queueName, data) => {
    if (!channel) throw new Error('Channel RabbitMQ belum siap!');
    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(data)), {
        persistent: true // Data tidak hilang kalau server mati
    });
};

module.exports = { connectRabbitMQ, sendToQueue };