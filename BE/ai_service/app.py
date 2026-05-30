from flask import Flask, request, jsonify
from ultralytics import YOLO
import easyocr
import os
import cv2
import traceback
from werkzeug.utils import secure_filename

app = Flask(__name__)

print("Memuat Model AI... Harap tunggu...")
try:
    model = YOLO("best.pt") 
    print("Model YOLO Siap!")
except Exception as e:
    print("WARNING: File best.pt belum ada! Server tetap nyala, tapi belum bisa scan.")
    model = None

reader = easyocr.Reader(['en', 'id'])
print("Model EasyOCR Siap!")

os.makedirs("temp_uploads", exist_ok=True)

@app.route('/api/scan-receipt', methods=['POST'])
def scan_receipt():
    if 'image' not in request.files:
        return jsonify({"error": "Tidak ada gambar yang dikirim"}), 400
    
    file = request.files['image']
    filename = secure_filename(file.filename)
    filepath = os.path.join("temp_uploads", filename)
    file.save(filepath)

    try:
        if not model:
            return jsonify({"error": "Model best.pt belum dipasang di server Python!"}), 500

        results = model.predict(source=filepath, save=False)
        
        img_cv = cv2.imread(filepath)
        ocr_result = reader.readtext(img_cv)
        detected_texts = [text[1] for text in ocr_result]

        transaction_data = {
            "merchant": "Toko Tidak Diketahui",
            "total": 0,
            "payment_method": "cash"
        }

        if len(detected_texts) > 0:
            transaction_data["merchant"] = detected_texts[0].title()

        for i, text in enumerate(detected_texts):
            lower_text = text.lower()

            if "debit" in lower_text or "card" in lower_text or "kartu" in lower_text:
                transaction_data["payment_method"] = "debit-card"
            elif "tunai" in lower_text or "cash" in lower_text:
                transaction_data["payment_method"] = "cash"
            elif "qris" in lower_text or "gopay" in lower_text or "pay" in lower_text:
                transaction_data["payment_method"] = "e-wallet"

            if any(keyword in lower_text for keyword in ["total", "toal", "toai", "jumlah", "jml"]):
                if i + 1 < len(detected_texts):
                    raw_total = detected_texts[i+1]
                    clean_string = raw_total.replace("O", "0").replace("o", "0").replace("D", "0").replace("d", "0")
                    only_numbers = ''.join(filter(str.isdigit, clean_string))
                    
                    if only_numbers:
                        transaction_data["total"] = int(only_numbers)
        
        if os.path.exists(filepath):
            os.remove(filepath)

        return jsonify({
            "status": "success",
            "data": transaction_data
        }), 200

    except Exception as e:
        print("====== ERROR DETECTED ======")
        traceback.print_exc()
        print("============================")
        
        if 'filepath' in locals() and os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)