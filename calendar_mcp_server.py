from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route("/api/auth", methods=["POST"])
def authenticate():
    data = request.get_json()

    # Check if request has a token
    token = data.get("token") if data else None

    if token:
        # This is where you'd normally validate the token with Google
        print(f"Received token: {token}")
        return jsonify({"status": "success", "message": "Token received"}), 200
    else:
        return jsonify({"status": "error", "message": "Token not provided"}), 400

@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Hello from Google Calendar MCP backend!"}), 200

if __name__ == "__main__":
    app.run(debug=False, host="0.0.0.0", port=5000)
