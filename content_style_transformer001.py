import tkinter as tk
from tkinter import filedialog
import google.generativeai as genai
import json
import os
import time
from pathlib import Path
import requests

# Gemini API配置
GOOGLE_API_KEY = "Your Google API Key"  # 替换为你的 Google API 密钥
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=AIzaSyAFmxUmSHr-OCvLKx_TR2hvNAU7hWl8wkg"


def select_folder():
    """打开文件夹选择对话框"""
    root = tk.Tk()
    root.withdraw()
    folder_path = filedialog.askdirectory(
        title="选择包含 Markdown 文件的文件夹"

    )
    return folder_path


def read_md_content(file_path):
    """读取MD文件内容"""
    with open(file_path, 'r', encoding='utf-8') as file:
        return file.read()


def get_transformed_content(content):
    """调用 Gemini API 获取改写后的内容"""
    try:
        headers = {
            "Content-Type": "application/json"
        }

        prompt = f"""请将以下教育内容改写成更有趣和吸引人的版本：
1. 标题要更加夸张、吸引人，让人忍不住想点进来看
2. 语言风格要辛辣、讽刺、现实、刻骨铭心
3. 保持原有的教育意义，但要用更有趣的方式表达
4. 可以加入现实生活中的例子和比喻
5. 保持markdown格式

原文内容：
{content}

请提供改写后的版本。"""

        data = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }

        response = requests.post(
            API_URL,
            headers=headers,
            json=data
        )

        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and result['candidates']:
                return result['candidates'][0]['content']['parts'][0]['text']
            else:
                print("API 响应格式不正确")
                return None
        else:
            print(f"请求失败: {response.status_code}")
            print(response.text)
            return None

    except Exception as e:
        print(f"API调用出错: {type(e).__name__}: {str(e)}")
        return None


def save_transformed_content(original_path, transformed_content):
    """保存改写后的内容到新的MD文件"""
    # 生成新文件名
    original_name = original_path.stem
    new_filename = f"[{original_name}_update].md"

    # 确保输出目录存在
    output_dir = original_path.parent / "改写后的内容"
    output_dir.mkdir(exist_ok=True)

    # 保存文件
    output_path = output_dir / new_filename
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write(transformed_content)

    print(f"已保存改写后的文件: {new_filename}")


def main():
    # 选择文件夹
    folder_path = select_folder()
    if not folder_path:
        print("未选择文件夹")
        return

    folder_path = Path(folder_path)

    # 获取所有MD文件
    md_files = list(folder_path.glob('*.md'))

    if not md_files:
        print("所选文件夹中没有找到Markdown文件")
        return

    print(f"找到 {len(md_files)} 个Markdown文件")

    # 处理每个文件
    success_count = 0
    for md_file in md_files:
        try:
            print(f"\n处理文件: {md_file.name}")

            # 读取文件内容
            content = read_md_content(md_file)

            # 获取改写后的内容
            transformed_content = get_transformed_content(content)

            if transformed_content:
                # 保存改写后的内容
                save_transformed_content(md_file, transformed_content)
                success_count += 1

            # 添加延时以避免API限制
            time.sleep(2)

        except Exception as e:
            print(f"处理文件 {md_file.name} 时出错: {str(e)}")

    # 打印统计信息
    print(f"\n处理完成:")
    print(f"总文件数: {len(md_files)}")
    print(f"成功转换: {success_count}")
    print(f"失败数量: {len(md_files) - success_count}")


if __name__ == "__main__":
    main()
