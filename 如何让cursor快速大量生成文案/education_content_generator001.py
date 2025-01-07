import tkinter as tk
from tkinter import filedialog
import requests
import json
import os
import time
from pathlib import Path

# OpenRouter API配置
OPENROUTER_API_KEY = "Your OpenRouter API Key"  # 请替换为你的API密钥
API_URL = "https://openrouter.ai/api/v1/chat/completions"


def select_file():
    """打开文件选择对话框让用户选择MD文件"""
    root = tk.Tk()
    root.withdraw()  # 隐藏主窗口
    file_path = filedialog.askopenfilename(
        title="选择Markdown文件",
        filetypes=[("Markdown files", "*.md")]
    )
    return file_path


def read_md_content(file_path):
    """读取MD文件内容"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.readlines()


def extract_topics(lines):
    """提取教育主题和子主题"""
    topics = []
    current_topic = None

    for line in lines:
        line = line.strip()
        if not line:
            continue

        if line[0].isdigit() and '.' in line:
            # 这是主题
            current_topic = line.split('.', 1)[1].strip()
            topics.append({
                'main': current_topic,
                'sub_topics': []
            })
        elif line.startswith('*') or line.startswith('	*'):
            # 这是子主题
            if current_topic and topics:
                sub_topic = line.replace('*', '').strip()
                topics[-1]['sub_topics'].append(sub_topic)

    return topics


def get_gemini_explanation(topic, sub_topic):
    """调用Gemini-2通过OpenRouter API获取解释"""
    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "Education Content Generator"
    }

    prompt = f"""请详细解释以下教育主题：
主题：{topic}
子主题：{sub_topic}

请提供详细的解释、实例和建议。"""

    data = {
        "model": "qwen/qwen-2-7b-instruct:free",
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens": 1000
    }

    try:
        response = requests.post(API_URL, headers=headers, json=data)
        response.raise_for_status()
        response_data = response.json()

        # 打印完整响应以便调试
        print("API响应:", json.dumps(response_data, indent=2, ensure_ascii=False))

        # 根据OpenRouter API的响应格式获取内容
        if 'choices' in response_data and len(response_data['choices']) > 0:
            return response_data['choices'][0]['message']['content']
        else:
            print(f"API响应格式异常: {response_data}")
            return None
    except Exception as e:
        print(f"API调用出错: {str(e)}")
        if 'response' in locals():
            print(f"响应内容: {response.text}")
        return None


def save_explanation(topic, content):
    """保存解释内容到MD文件"""
    # 清理文件名中的非法字符
    safe_topic = "".join(x for x in topic if x.isalnum()
                         or x in (' ', '-', '_'))
    filename = f"[{safe_topic}].md"

    # 确保输出目录存在
    output_dir = Path("教育学内容")
    output_dir.mkdir(exist_ok=True)

    file_path = output_dir / filename
    with open(file_path, 'w', encoding='utf-8') as file:
        file.write(f"# {topic}\n\n")
        file.write(content)

    print(f"已保存文件: {filename}")


def main():
    # 选择文件
    file_path = select_file()
    if not file_path:
        print("未选择文件")
        return

    # 读取内容
    lines = read_md_content(file_path)
    topics = extract_topics(lines)

    # 处理每个主题和子主题
    for topic in topics:
        print(f"\n处理主题: {topic['main']}")

        for sub_topic in topic['sub_topics']:
            print(f"  处理子主题: {sub_topic}")

            # 获取Gemini的解释
            explanation = get_gemini_explanation(topic['main'], sub_topic)

            if explanation:
                # 保存解释内容
                save_explanation(f"{topic['main']}_{sub_topic}", explanation)

            # 添加延时以避免API限制
            time.sleep(2)


if __name__ == "__main__":
    main()
