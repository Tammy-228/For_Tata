import tkinter as tk
from tkinter import filedialog
import google.generativeai as genai
import json
import os
import time
from pathlib import Path
import requests

# Gemini API配置
GOOGLE_API_KEY = "Your Google API Key"
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


def get_relevant_images(content):
    """调用 Gemini API 获取相关图片链接"""
    try:
        headers = {
            "Content-Type": "application/json"
        }

        prompt = f"""请为以下教育内容推荐5-6张相关的图片链接：
1. 图片要与内容高度相关
2. 图片要色彩丰富饱满
3. 图片要有趣且能吸引人
4. 每个图片链接要配上简短的说明
5. 返回格式要求：
   ![图片说明1](图片链接1)
   ![图片说明2](图片链接2)
   以此类推...

内容：
{content}

请提供图片链接和说明。"""

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


def save_enriched_content(original_path, content, images):
    """保存添加了图片的内容到新的MD文件"""
    # 生成新文件名
    original_name = original_path.stem
    new_filename = f"[{original_name}_pic].md"

    # 确保输出目录存在
    output_dir = original_path.parent / "图片增强版"
    output_dir.mkdir(exist_ok=True)

    # 组合新内容
    new_content = content + "\n\n## 相关图片\n\n" + images

    # 保存文件
    output_path = output_dir / new_filename
    with open(output_path, 'w', encoding='utf-8') as file:
        file.write(new_content)

    print(f"已保存增强版文件: {new_filename}")


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

            # 获取相关图片
            images = get_relevant_images(content)

            if images:
                # 保存增强后的内容
                save_enriched_content(md_file, content, images)
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
