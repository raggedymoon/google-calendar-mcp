from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/auth', methods=['GET'])
def auth_check():
    return jsonify({"message": "Auth endpoint is working."}), 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)
