# Guojiajia 过家家

[English](#english) | [中文](#中文)

基于 OpenClaw 的角色扮演与虚拟伙伴 · Role-playing & virtual companions powered by OpenClaw

---

## 中文

### 什么是「过家家」？

「过家家」是小朋友常玩的一种角色扮演游戏：扮演妈妈、老师、姐姐等，照顾虚拟的家人、给学生上课。很多孩子会乐此不疲地沉浸在这种想象情境里。

### 为什么做这个项目？

我有个 5 岁的女儿，特别喜欢玩过家家——当「妈妈」照顾虚拟的姐姐和妹妹（现实中并没有）、像我们教她一样去「教育」这些虚拟角色。后来我们让她用上了豆包（国内的一款 AI 助手），她更着迷了，有时能自己玩好几个小时。

但有两个问题一直困扰我们：

1. **记忆不连贯**：豆包经常记不住前面游戏里的细节，她一提起来就会很沮丧。
2. **难以定制**：作为家长，我们希望能把 AI 设定成「数学老师」或「英语老师」之类，让游戏更有教育意义。

基于 [OpenClaw](https://github.com/openclaw) 在 **Soul**（人格/灵魂）和 **Memory**（记忆）上的能力，我觉得可以更好地解决这些问题，既保留过家家的乐趣，又做到寓教于乐。所以用业余时间做了这个项目：一个 App + HTTP 代理，接入 OpenClaw Gateway，希望能同时满足「更好记忆」和「可定制角色」这两个目标。

### 计划路线（四个阶段）

1. **Android App + 本地 OpenClaw**  
   做一款安卓应用，和本机电脑上的 OpenClaw 打通，先让对话和记忆在本地跑起来。

2. **嵌入式语音硬件 + 玩偶**  
   结合嵌入式语音硬件和她喜欢的动画形象玩偶，做成一个 AI 玩具，让过家家更有沉浸感。

3. **云端服务**  
   把 Memory、Soul、Skill 等部署到云上，这样出门、旅行也能用，成为一个可以长期陪伴她的「小伙伴」。

4. **面向更多人的陪伴**  
   在一个人人多少有点「社恐」的时代，希望这个项目也能帮到和我们年纪相仿的大朋友——作为一个可倾诉、更懂你的对象，并且可以按自己的需求定制。

---

如果你也有兴趣，欢迎一起参与这个项目。

---

## English

### What is "Guojiajia" (过家家)?

*Guojiajia* is a classic children’s role-playing game: kids pretend to be mom, teacher, older sister, etc., and “take care” of imaginary family members or “teach” imaginary students. Many children love getting lost in these make-believe scenarios.

### Why This Project?

I have a 5-year-old daughter who loves playing guojiajia—being “mom,” caring for imaginary older and younger sisters (she doesn’t have real ones), and “teaching” them the way we teach her. When we introduced her to Doubao (a popular AI assistant in China), she got even more absorbed and sometimes plays for hours on her own.

Two issues kept bothering us:

1. **Poor continuity**  
   Doubao often doesn’t remember details from earlier in the game, which frustrates her when she refers back to them.

2. **Limited customization**  
   As parents, we wanted to shape the AI—e.g. as a “math teacher” or “English teacher”—so the game could be more educational.

[OpenClaw](https://github.com/openclaw) offers stronger **Soul** (persona) and **Memory** capabilities. I wanted to use that to address both problems: keep the fun of guojiajia while making it more “learn through play.” So in my spare time I started this project: an app plus an HTTP proxy that connects to the OpenClaw Gateway, aiming to deliver better memory and customizable characters.

### Roadmap (Four Phases)

1. **Android app + local OpenClaw**  
   Build an Android app that talks to OpenClaw running on a local machine, so conversation and memory work at home first.

2. **Embedded voice hardware + plush toy**  
   Combine embedded voice hardware with her favorite cartoon-character plush to create an AI toy for a more immersive guojiajia experience.

3. **Cloud deployment**  
   Put Memory, Soul, and Skills in the cloud so the companion is available anywhere—travel, visits, etc.—as a long-term “little friend.”

4. **Broader companionship**  
   In an age where many of us are a bit “socially anxious,” we’d like this to also help older users—as a listener that “gets” you and can be customized to your needs.

---

If this resonates with you, you’re welcome to join and contribute.

---

## Star History

[![Star History Chart](https://api.star-history.com/image?repos=ghpPeng/Guojiajia&type=Date)](https://star-history.com/#ghpPeng/Guojiajia&Date)
