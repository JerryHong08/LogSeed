import os
import sys
import json
from openai import OpenAI
from fastapi import FastAPI


# DeepSeek 配置
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_BASE_URL = "https://api.deepseek.com"
DEEPSEEK_MODEL = "deepseek-chat"

# SiliconFlow 配置
SILICONFLOW_API_KEY = os.getenv("SiliconFlow_apikey")
SILICONFLOW_BASE_URL = "https://api.siliconflow.cn/v1"
SILICONFLOW_MODEL = "deepseek-ai/DeepSeek-V2.5"

SYSTEM_PROMPT = """
你是任务分解专家。请根据输入的“用户身份”、“核心任务数量”、“每个核心任务的子任务数量”，为该身份生成合理的学习/成长/工作等相关“核心任务”及其“子任务”。
要求：
1. 只输出JSON对象，结构如下：
{
  "core_tasks": ["核心任务1", "核心任务2", ...],
  "sub_tasks_list": [
    ["子任务1-1", "子任务1-2", ...],
    ["子任务2-1", ...],
    ...
  ]
}
2. 核心任务数量与输入参数一致，每个核心任务下的子任务数量也与输入一致。
3. 所有任务内容要与用户身份紧密相关，具体且不重复。
4. 不要输出任何解释说明，只输出JSON。
5. 示例（仅供格式参考）：
{
  "core_tasks": ["Linux基础", "数据结构与算法"],
  "sub_tasks_list": [
    ["Linux简介与环境搭建", "Linux文件系统与基本命令"],
    ["线性表与链表", "树与图"]
  ]
}
"""

def initialize_client(botselect):
    if botselect == "deepseek":
        return OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL), DEEPSEEK_MODEL
    elif botselect == "siliconflow":
        return OpenAI(api_key=SILICONFLOW_API_KEY, base_url=SILICONFLOW_BASE_URL), SILICONFLOW_MODEL
    else:
        raise ValueError(f"Unsupported botselect: {botselect}")

def generate_task_plan(identity, num_core_tasks, num_sub_tasks, botselect="deepseek"):
    client, model = initialize_client(botselect)
    user_prompt = (
        f"用户身份：{identity}\n"
        f"核心任务数量：{num_core_tasks}\n"
        f"每个核心任务的子任务数量：{num_sub_tasks}"
    )
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt}
    ]
    try:
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            response_format={'type': 'json_object'}
        )
        result = json.loads(response.choices[0].message.content)
        return result
    except Exception as e:
        print(f"AI生成任务失败: {e}")
        return None

app = FastAPI()



@app.get("/generate_tasks")
async def generate_tasks(identity: str, coreNum: int, subNum: int):
    result = generate_task_plan(identity, coreNum, subNum)
    if result is None:
        return {"error": "Task generation failed"}
    return result

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)