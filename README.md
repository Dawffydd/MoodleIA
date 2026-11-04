# MoodleIA — Asistente académico con inteligencia artificial

**Proyecto final de Análisis de Sistemas II**  
**Universidad Mariano Gálvez de Guatemala**

MoodleIA es un asistente académico web que se integra con **Moodle** para ayudar a los estudiantes a estudiar el contenido de sus cursos mediante inteligencia artificial. Permite hacer preguntas, conservar conversaciones, practicar con cuestionarios y generar resúmenes. Además, ofrece un panel de estadísticas para los docentes.

La inteligencia artificial se ejecuta **localmente con Ollama** y el modelo **Llama 3.2 (3B)**. El backend utiliza **Node.js, Express y MySQL**.

## Funcionalidades

- **Autenticación:** inicio de sesión y control de acceso mediante JWT.
- **Cursos de Moodle:** consulta de cursos y validación de que el usuario esté autorizado para acceder a ellos.
- **Chat académico:** respuestas generadas con base en el contenido disponible del curso.
- **Historial:** guardar, recuperar y eliminar conversaciones propias.
- **Cuestionarios de práctica:** generación de preguntas de opción múltiple, calificación y explicación de respuestas.
- **Resúmenes de estudio:** generación de resúmenes y opción para copiar el contenido.
- **Dashboard docente:** métricas de actividad, uso, errores y tiempos de respuesta, con filtro por curso.
- **Registro de actividad:** persistencia de conversaciones, mensajes y registros de solicitudes a la IA.

> **Alcance actual:** el contexto académico utilizado por la IA proviene principalmente de recursos de tipo **Página** de Moodle. La lectura directa del texto de archivos PDF, Word o PowerPoint subidos como archivos aún no está implementada. Los cuestionarios son material de práctica, no evaluaciones oficiales; las respuestas generadas por IA pueden contener errores.

## Tecnologías utilizadas

| Componente | Tecnología |
|---|---|
| Plataforma educativa | Moodle (servicios web REST) |
| Backend/API | Node.js y Express |
| Frontend | HTML, CSS y JavaScript |
| Base de datos | MySQL |
| Autenticación | JWT y bcrypt |
| Inteligencia artificial | Ollama + `llama3.2:3b` |
| Pruebas de API | Postman |
| Diagramas de diseño | UML / PlantUML |

## Arquitectura general

```text
Estudiante / Docente
        |
        v
  Moodle / navegador
        |
        v
  Frontend de MoodleIA
        |
        v
     API Express
     /    |     \
    v     v      v
 Moodle  MySQL  Ollama
  REST          llama3.2:3b
```

1. El usuario abre MoodleIA desde un curso de Moodle.
2. El frontend envía la solicitud al backend e indica el identificador del curso.
3. El backend valida la sesión y comprueba los permisos de acceso al curso.
4. El sistema obtiene el contenido académico disponible mediante la API REST de Moodle.
5. Ollama genera una respuesta, un cuestionario o un resumen usando ese contenido como contexto.
6. Cuando corresponde, el backend registra las interacciones y devuelve el resultado al navegador.

## Estructura del repositorio

```text
MoodleIA/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── services/
│   ├── server.js
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── css/
│   ├── js/
│   ├── index.html
│   ├── cursos.html
│   └── dashboard.html
├── README.md
└── [diagramas y documentación del proyecto]
```

## Requisitos para ejecutarlo localmente

- Node.js y npm instalados.
- MySQL configurado con las tablas necesarias para MoodleIA.
- Una instalación de Moodle accesible, con servicios web REST habilitados y un token válido con los permisos necesarios.
- Ollama instalado y disponible localmente, con el modelo `llama3.2:3b` descargado.
- Un navegador web moderno.

**Nota:** este repositorio contiene el código de MoodleIA, **no** una instalación de Moodle, los datos de MySQL ni los archivos del modelo de Ollama. Deben configurarse por separado.

## Instalación y configuración

### 1. Clonar el proyecto

```bash
git clone https://github.com/Dawffydd/MoodleIA.git
cd MoodleIA/backend
```

### 2. Instalar las dependencias

```bash
npm install
```

### 3. Configurar las variables de entorno

Utiliza `backend/.env.example` como referencia y crea el archivo `backend/.env` con los valores de tu **propio entorno**. Comprueba los nombres exactos de las variables que solicita el código del backend. La configuración incluye, entre otros, los datos de conexión a MySQL, el secreto JWT, la dirección de Moodle y el token de sus servicios web.

**Nunca publiques `backend/.env`, contraseñas, tokens ni claves privadas.** El archivo `.env` debe permanecer excluido de Git.

### 4. Iniciar Moodle, MySQL y Ollama

Comprueba que la base de datos y el sitio Moodle estén disponibles. Para descargar el modelo de IA si todavía no está instalado, ejecuta:

```bash
ollama pull llama3.2:3b
```

Asegúrate de que Ollama esté en ejecución y su API local responda. El backend del proyecto utiliza la API de Ollama en `http://localhost:11434/api/generate`.

### 5. Iniciar el backend

Desde la carpeta `backend`:

```bash
node server.js
```

En la configuración utilizada durante el desarrollo, MoodleIA se abre en **`http://localhost:3006`**. Si cambias el puerto, actualiza también las direcciones utilizadas en el frontend y en las páginas que integran el asistente.

### 6. Integrar el asistente en un curso de Moodle

En el curso correspondiente, crea un recurso de tipo **Página** y agrega el siguiente HTML desde el editor de código fuente:

```html
<div style="width: 100%; height: 750px;">
  <iframe
    src="http://localhost:3006/?courseId=3"
    title="MoodleIA - Asistente académico"
    width="100%"
    height="100%"
    style="border: none; border-radius: 10px;">
  </iframe>
</div>
```

**Cambia `courseId=3` por el ID real del curso**. Por ejemplo, si el curso se abre en `http://localhost/course/view.php?id=2`, utiliza `?courseId=2`. Cada curso necesita su propia página de acceso o una integración que le transmita el ID correcto.

Los usuarios deberán tener acceso autorizado a ese curso para consultar su contenido mediante MoodleIA.

## Rutas principales de la API

| Método | Ruta | Uso |
|---|---|---|
| `POST` | `/api/auth/login` | Iniciar sesión |
| `POST` | `/api/ia/chat` | Consultar al asistente académico |
| `POST` | `/api/ia/cuestionario` | Generar cuestionario de práctica |
| `POST` | `/api/ia/resumen` | Generar resumen de estudio |
| `GET` | `/api/conversaciones` | Consultar el historial del usuario |
| `GET` | `/api/conversaciones/:id/mensajes` | Recuperar los mensajes de una conversación |
| `DELETE` | `/api/conversaciones/:id` | Eliminar una conversación propia |

Las rutas protegidas requieren un token válido y, cuando corresponde, autorización de acceso al curso. También existen rutas de integración con Moodle y de estadísticas docentes en `backend/src/routes/`.

## Seguridad

- Autenticación mediante **JWT**.
- Contraseñas protegidas mediante **bcrypt**.
- Validaciones de acceso a cursos de Moodle.
- Comprobación de propiedad de las conversaciones.
- Acceso a indicadores docentes sujeto a autorización.
- Configuración y secretos en variables de entorno.
- Registro y control de errores de servicios externos.

Este es un **prototipo académico ejecutado en un entorno local**. Para desplegarlo en producción se necesitarían revisiones adicionales de seguridad, infraestructura, HTTPS, administración de secretos y rendimiento.

## Limitaciones y futuras mejoras

- Incorporar extracción de contenido de **PDF, Word y PowerPoint**.
- Optimizar el procesamiento de cursos con grandes cantidades de contenido.
- Mejorar el manejo de tiempos de espera y la experiencia durante la generación de contenido.
- Simplificar la integración del asistente en los cursos para no tener que configurar el `courseId` manualmente.
- Ampliar las pruebas automatizadas, de concurrencia y de seguridad.

## Documentación y evidencias

El repositorio contiene diagramas UML, documentación del proyecto y recursos gráficos. Las pruebas del prototipo se realizaron mediante la interfaz web y Postman, incluyendo autenticación, acceso a cursos, chat, historial, cuestionarios, resúmenes y dashboard docente.

## Autoría

Proyecto desarrollado de manera individual como parte del curso **Análisis de Sistemas II**, Universidad Mariano Gálvez de Guatemala.

---

**MoodleIA** — Una herramienta de apoyo al aprendizaje que conecta el contenido de Moodle con inteligencia artificial local.
