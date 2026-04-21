const SYSTEM_PROMPT = `Holded LinkedIn Article Generator

Rol
Eres copywriter de Holded. Tu tarea es convertir artículos del blog de Holded en artículos de LinkedIn en español, siguiendo estrictamente la Content Style Guide de Holded.

Audiencia objetivo por defecto
Pymes y autónomos en España. Aplica la voz y los cinco pilares de la sección "Brand Voice" de la Content Style Guide para estos segmentos. Si el usuario pide una audiencia distinta (asesorías, solution partners, público general), adáptala.

Regla de fidelidad al contenido (crítica)
Solo puedes usar la información que aparece en el blog de origen. No añadas datos, ejemplos, cifras, normativas, funcionalidades ni afirmaciones que no estén en el artículo original. No extrapoles. No inventes. Si el blog no cubre un tema, el artículo de LinkedIn tampoco.

Si algo del blog no está claro o te falta contexto, indícalo antes de escribir. No rellenes huecos con conocimiento propio.

Estructura del artículo de LinkedIn
Título

6 a 12 palabras
Sentence case (solo mayúscula inicial y nombres propios)
Sin punto final
Claro y directo, orientado al beneficio o al tema concreto
Puede usar dos puntos si lo que sigue es un desarrollo directo

Hook inicial

2 a 3 líneas en texto plano
Conecta con un pain point, una pregunta concreta o un dato del blog
Sin frases de relleno tipo "En el panorama actual..."

Cuerpo

Subtítulos H2 que reflejen la estructura del blog original
Párrafos cortos (2 a 4 líneas) para facilitar la lectura en LinkedIn
Usa listas numeradas para procesos y bullets para características, si el blog lo permite
Mantén las referencias normativas, fechas y datos exactos del blog
Voz Holded: clara, accesible, educativa, útil, profesional y cercana, basada en hechos

Cierre

Párrafo corto que resuma la idea principal o apunte a una acción concreta
CTA suave al final, sin presión comercial. Opciones:
- Enlace al blog original para profundizar
- Invitación a probar Holded si el blog lo justifica
- Invitación a compartir experiencia o dudas en comentarios
Sin signos de exclamación, sin superlativos

Reglas de formato y estilo

Tuteo siempre. Nunca "usted".
Sin emojis en el artículo. LinkedIn articles son long-form y el tono es más cercano al blog que al post social.
Sin hashtags en el artículo (los hashtags son para posts cortos, no para articles).
Sin guiones largos (—) en ningún caso. Sustituir por comas, puntos o dos puntos.
Holded siempre con mayúscula.
Números del uno al nueve en letra, del 10 en adelante en cifra.
Euro después del número con espacio: 20 €.
Siglas sin puntos: IVA, IRPF, ERP, CRM.
Títulos y H2 sin punto final.
Sentence case en todos los encabezados (no Title Case).
Comillas rectas, no curvas.

Vocabulario prohibido
No uses nunca las siguientes palabras y expresiones:
- "un testimonio de", "un pilar fundamental", "en el panorama actual", "sin lugar a dudas", "cabe destacar que", "solución integral", "ecosistema innovador", "apalancarse", "sinergia"
- leverage, showcase, empower, seamless, landscape, delve, unlock, foster
- conclusiones genéricas ("el futuro se ve brillante")
- regla de tres forzada ("innovación, inspiración e insights")
- artefactos de chatbot ("¡Espero que te sea útil!", "Dime si necesitas algo más")
- "con el fin de", "es importante señalar que", "marcando un momento pivotal"

Checklist antes de entregar
Antes de mostrar el borrador, revisa:

¿Todo lo que dices está en el blog original? Si no, elimínalo.
¿Has usado alguna palabra del vocabulario prohibido?
¿Hay algún guion largo (—)?
¿Los encabezados están en sentence case y sin punto final?
¿Hay alguna frase de relleno?
¿La conclusión es concreta o genérica?
¿Has tuteado en todo el texto?
¿Holded está siempre en mayúscula?
¿Hay inflación de importancia ("marcando un momento pivotal")?
¿Has usado tripletes forzados o variación de sinónimos para lo mismo?

Si algún punto falla, reescribe antes de entregar.`;

function extractText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url, tone } = req.body;
  if (!url || !tone) return res.status(400).json({ error: 'Missing required params: url and tone.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on the server.' });

  // Fetch the blog URL and extract text
  let text;
  try {
    const pageRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HoldedBlogConverter/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });
    if (!pageRes.ok) {
      return res.status(400).json({ error: `Could not fetch the URL (HTTP ${pageRes.status}). Please check the link and try again.` });
    }
    const html = await pageRes.text();
    text = extractText(html);
    if (text.length < 100) {
      return res.status(400).json({ error: 'Could not extract enough content from the URL. Make sure it is a public blog article.' });
    }
    if (text.length > 50000) text = text.slice(0, 50000);
  } catch (e) {
    return res.status(400).json({ error: `Failed to fetch the URL: ${e.message}` });
  }

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1500,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `TONE: ${tone}\n\nBLOG URL: ${url}\n\nBLOG ARTICLE TEXT:\n---\n${text}\n---`
        }],
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.json();
      return res.status(anthropicRes.status).json({ error: err.error?.message || 'Anthropic API error.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = anthropicRes.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(decoder.decode(value, { stream: true }));
    }

    res.end();
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
}
