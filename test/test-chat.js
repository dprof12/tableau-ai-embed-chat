/**
 * Test script to verify API Chatbot handler locally for decoupled project
 */
import handler from '../api/chat.js';
import dotenv from 'dotenv';
dotenv.config();

async function runMockTest() {
  console.log('--- Testing Decoupled Tableau AI Chatbot Logic ---');

  const mockReq = {
    method: 'POST',
    body: {
      dashboardName: 'Demo Analisis Penjualan Toko Retail',
      sheetsData: [
        {
          worksheetName: 'Ringkasan Penjualan Kategori',
          columns: ['Kategori Produk', 'Total Omset', 'Unit Terjual', 'YoY Growth'],
          rows: [
            ['Elektronik', '$450,000', '15,000', '+18.5%'],
            ['Fashion & Pakaian', '$320,000', '42,000', '+12.4%'],
            ['Kebutuhan Rumah Tangga', '$180,000', '8,500', '-2.1%'],
            ['Buku & Alat Tulis', '$60,000', '12,500', '+4.0%']
          ]
        }
      ],
      message: 'Berapa persen pertumbuhan penjualan pakaian YoY?',
      chatHistory: []
    }
  };

  let statusCode = 200;
  const headers = {};

  const mockRes = {
    setHeader: (k, v) => { headers[k] = v; },
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          console.log(`[Response Status]: ${statusCode}`);
          console.log('[Response Data]:', JSON.stringify(data, null, 2));
        },
        end: () => console.log(`[Response End]: ${statusCode}`)
      };
    }
  };

  await handler(mockReq, mockRes);
}

runMockTest().catch(console.error);
