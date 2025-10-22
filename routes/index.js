import cron from "node-cron";
import fetch from "node-fetch";

// ดึงราคาทุกวัน 08:00
cron.schedule("0 8 * * *", async () => {
  console.log("กำลังดึงราคาน้ำมัน...");

  const r = await fetch("https://thai-oil-api.vercel.app/latest");
  const data = await r.json();

  // ตัวอย่าง: เช็กเฉพาะ 4 ประเภท
  const oilTypes = ["gasohol_95", "gasohol_91", "e20", "diesel_b7"];

  for (const type of oilTypes) {
    let price;
    switch (type) {
      case "gasohol_95": price = parseFloat(data.response.stations.ptt.gasohol_95.price); break;
      case "gasohol_91": price = parseFloat(data.response.stations.ptt.gasohol_91.price); break;
      case "e20":       price = parseFloat(data.response.stations.ptt.e20.price); break;
      case "diesel_b7": price = parseFloat(data.response.stations.ptt.diesel_b7.price); break;
    }

    // ดึงราคาครั้งล่าสุดจาก Google Sheet
    const prev = await fetch(`${SHEET_URL}?oil_type=${type}`);
    const prevData = await prev.json();

    // ถ้าราคาปัจจุบันไม่เหมือนราคาครั้งล่าสุด → ส่งข้อความให้ Bot
    if (!prevData.lastPriceBefore || prevData.lastPriceBefore !== price) {
      await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oil_type: type, price })
      });

      // ส่งข้อความ LINE (Broadcast หรือ Push) ว่าราคามีการเปลี่ยนแปลง
      await sendLineUpdate(`⛽ ราคาน้ำมัน ${type.replace("_"," ").toUpperCase()} วันนี้ ${price} บาท/ลิตร`);
    }
  }
});

async function sendLineUpdate(msg) {
  const broadcastURL = "https://api.line.me/v2/bot/message/broadcast";
  await fetch(broadcastURL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.LINE_TOKEN}`
    },
    body: JSON.stringify({ messages: [{ type: "text", text: msg }] })
  });
}
