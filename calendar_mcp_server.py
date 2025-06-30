from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/api/auth', methods=['GET'])
def auth():
    return jsonify({'message': 'Auth endpoint is working'}), 200

@app.route('/', methods=['GET'])
def home():
    return jsonify({'message': 'Hello from Google Calendar MCP backend!'}), 200

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)
