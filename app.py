from flask import Flask, flash, redirect, render_template, request

# Configure application
app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        return render_template("upload.html")
    else:
        return render_template("index.html")