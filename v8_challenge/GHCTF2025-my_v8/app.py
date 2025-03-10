import subprocess
import os
from flask import Flask, request, jsonify, render_template, send_from_directory

app = Flask(__name__)
UPLOAD_FOLDER = "uploads"
RESULT_FOLDER = "results"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULT_FOLDER, exist_ok=True)

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    file = request.files["file"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    D8_PATH = "/app/my_v8/d8"  # 指定 d8 的路径
    result_file = os.path.join(RESULT_FOLDER, "result.txt")  # 输出结果的文件路径

    # 执行 exp.js 代码并通过 d8 继续执行命令
    try:
        # 先运行 exp.js，触发 getshell
        process = subprocess.Popen([D8_PATH, file_path], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        
        # 输出调试信息，检查 shell 是否成功启动
        shell_command = "cat /flag\n"
        process.stdin.write(shell_command)  # 将命令写入stdin
        process.stdin.flush()  # 确保命令发送到 d8

        # 获取执行结果
        stdout, stderr = process.communicate()  # 等待并获取执行结果

        # 输出调试信息，检查命令执行结果
        print("stdout:", stdout)
        print("stderr:", stderr)

        # 如果 stdout 包含预期的输出，说明 shell 已经启动并执行成功
        if stdout:
            # 将结果写入文件
            with open(result_file, "w") as f:
                f.write(stdout)

            return jsonify({"output": "Some messages has been written to /result/result.txt"}), 200
        else:
            return jsonify({"error": "Shell not triggered or unexpected output"}), 500

    except Exception as e:
        print("执行失败:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route('/result/<filename>')
def show_result(filename):
    # 提供结果文件的访问
    return send_from_directory(RESULT_FOLDER, filename)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080, debug=True)

