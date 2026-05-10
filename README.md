# VoiceNote AI v5 — Transcripción Real con Groq + Claude AI

Plataforma completa de transcripción y análisis de reuniones con IA.

---

## 🚀 Levantar el proyecto

```bash
# 1. Crea la carpeta y copia los archivos

# 2. Configura las variables de entorno
cp .env.example .env
# Edita .env con tus API keys

# 3. Levanta todo
docker compose up -d --build
```

Abre **http://localhost:3000** → Regístrate → Graba → ¡Transcripción real!

---

## 🔑 Configurar las API keys (.env)

```env
JWT_SECRET=mi-clave-super-secreta-larga-2024

# Transcripción real con Whisper
GROQ_API_KEY=gsk_...tu_clave_aqui

# Resúmenes con Claude AI (principal)
CLAUDE_API_KEY=sk-ant-...tu_clave_aqui

# Resúmenes con Gemini (fallback)
GEMINI_API_KEY=AIza...tu_clave_aqui
```

---

## ✨ Novedades v5

| Feature                        | Detalle |
|-------------------------------|---------|
| 🎙 Groq Whisper Large v3       | Transcripción ultra-rápida en tiempo real |
| 👥 Diarización de hablantes    | Identifica Hablante 1, 2, 3, 4 por pausas |
| 🤖 Claude AI + Gemini fallback | Resúmenes ejecutivos estructurados |
| 🔇 Modos de audio              | Silencio / Ambiente / Conferencia |
| 🧹 Limpiar texto               | Elimina muletillas y repeticiones |
| 📄 PDF premium                 | Diseño profesional con burbujas por hablante |
| 📝 DOCX premium                | Word con banner de color, tablas y footer |
| 🌐 Bilingüe ES/EN              | Cambia idioma desde Configuración |
| ⚙️ Configuración pro           | Perfil, apariencia, API, acerca de |
| 🗑️ Eliminar cuenta             | Con confirmación por email |
| ⭐ Calificar la app            | Sistema de estrellas integrado |
| 🔐 Actualizar perfil           | Nombre y contraseña desde la app |

---

## 🎙 Modos de captura de audio

| Modo         | Uso recomendado |
|-------------|----------------|
| 🔇 Silencio  | Oficina tranquila, llamadas 1:1 |
| 🔊 Ambiente  | Captura natural sin filtros |
| 🎤 Conferencia | Sala de reuniones, múltiples voces |

---

## 📁 Estructura

```
voicenote-v5/
├── .env.example
├── .env                  ← creas este archivo
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── lib/api.ts
    └── app/
        ├── layout.tsx
        ├── globals.css
        ├── page.tsx               ← Dashboard principal
        ├── login/page.tsx
        ├── register/page.tsx
        └── share/[token]/page.tsx
```

---

## Comandos útiles

```bash
docker compose up -d --build   # Primera vez o cambios en código
docker compose up -d           # Iniciar sin rebuild
docker compose down            # Apagar
docker compose down -v         # Apagar y borrar base de datos
docker compose logs backend    # Ver logs del backend
```