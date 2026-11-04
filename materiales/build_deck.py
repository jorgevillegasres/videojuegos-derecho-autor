# -*- coding: utf-8 -*-
"""Genera el deck de la conferencia '¿De quién es tu videojuego?'."""

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# ---------- Sistema de diseño ----------
BG      = RGBColor(0x0B, 0x0E, 0x13)
PANEL   = RGBColor(0x14, 0x19, 0x22)
PANEL2  = RGBColor(0x1B, 0x22, 0x2D)
INK     = RGBColor(0xF2, 0xEF, 0xE6)
MUTED   = RGBColor(0x9A, 0xA3, 0xAF)
ACCENT  = RGBColor(0xB6, 0xFF, 0x3B)
ACCENT2 = RGBColor(0xFF, 0x5C, 0x7A)
SOFT    = RGBColor(0x2A, 0x33, 0x3F)
WHITE   = RGBColor(0xFF, 0xFF, 0xFF)

TITLE_FONT = "Arial Black"
BODY_FONT  = "Segoe UI"
MONO_FONT  = "Consolas"

TOTAL = 33

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]


def new_slide():
    s = prs.slides.add_slide(blank)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = BG
    return s


def txt(s, text, x, y, w, h, size=18, bold=False, color=INK, font=BODY_FONT,
        align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.0, italic=False):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    p = tf.paragraphs[0]
    p.alignment = align
    p.line_spacing = spacing
    r = p.add_run()
    r.text = text
    r.font.name = font
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.italic = italic
    r.font.color.rgb = color
    return tb


def rich(s, x, y, w, h, lines, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP):
    tb = s.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    first = True
    for ln in lines:
        p = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        p.alignment = ln.get("align", align)
        p.space_after = Pt(ln.get("after", 0))
        p.space_before = Pt(ln.get("before", 0))
        p.line_spacing = ln.get("spacing", 1.0)
        r = p.add_run()
        r.text = ln["t"]
        r.font.name = ln.get("font", BODY_FONT)
        r.font.size = Pt(ln.get("size", 18))
        r.font.bold = ln.get("bold", False)
        r.font.italic = ln.get("italic", False)
        r.font.color.rgb = ln.get("color", INK)
    return tb


def shape(s, x, y, w, h, fill=PANEL, line=SOFT, rounded=True, radius=0.08):
    kind = MSO_SHAPE.ROUNDED_RECTANGLE if rounded else MSO_SHAPE.RECTANGLE
    shp = s.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.75)
    shp.shadow.inherit = False
    if rounded:
        try:
            shp.adjustments[0] = radius
        except Exception:
            pass
    return shp


def circle(s, x, y, d, fill=ACCENT, line=None):
    shp = s.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(y), Inches(d), Inches(d))
    shp.fill.solid()
    shp.fill.fore_color.rgb = fill
    if line is None:
        shp.line.fill.background()
    else:
        shp.line.color.rgb = line
        shp.line.width = Pt(0.75)
    shp.shadow.inherit = False
    return shp


def kicker(s, text, color=ACCENT):
    txt(s, text.upper(), 0.7, 0.45, 9.0, 0.3, size=10, bold=True, color=color, font=MONO_FONT)


def page(s, n):
    txt(s, f"{n:02d} / {TOTAL}", 11.85, 7.08, 0.8, 0.25, size=9, color=MUTED,
        align=PP_ALIGN.RIGHT, font=MONO_FONT)


def pixel_motif(s, x=11.4, y=0.5, accent_index=4):
    """Tres por tres de cuadrados; uno acentuado."""
    d = 0.16
    gap = 0.08
    for row in range(3):
        for col in range(3):
            idx = row * 3 + col
            fill = ACCENT if idx == accent_index else PANEL2
            shp = s.shapes.add_shape(MSO_SHAPE.RECTANGLE,
                                     Inches(x + col * (d + gap)),
                                     Inches(y + row * (d + gap)),
                                     Inches(d), Inches(d))
            shp.fill.solid()
            shp.fill.fore_color.rgb = fill
            shp.line.fill.background()
            shp.shadow.inherit = False


# ---------- 01 · Título ----------
s = new_slide()
pixel_motif(s, 11.5, 0.55, 4)
kicker(s, "Conferencia · 3 horas · Creadores y desarrolladores")
rich(s, 0.7, 1.55, 9.6, 3.2, [
    {"t": "¿De quién es", "size": 68, "bold": True, "font": TITLE_FONT, "spacing": 0.95},
    {"t": "tu videojuego?", "size": 68, "bold": True, "font": TITLE_FONT,
     "color": ACCENT, "spacing": 0.95},
])
rich(s, 0.7, 4.75, 8.8, 1.1, [
    {"t": "Derecho de autor para creadores: cómo proteger lo que haces", "size": 21, "color": MUTED},
    {"t": "antes de que alguien más lo registre.", "size": 21, "color": MUTED},
])
txt(s, "[Nombre del conferencista]  ·  [Fecha]  ·  [Lugar]", 0.7, 6.55, 8, 0.3,
    size=12, color=MUTED, font=MONO_FONT)
page(s, 1)

# ---------- 02 · Estadísticas ----------
s = new_slide()
kicker(s, "El tamaño del problema")
shape(s, 0.7, 1.55, 5.85, 3.6, fill=PANEL)
shape(s, 6.78, 1.55, 5.85, 3.6, fill=PANEL)
txt(s, "$880M", 1.0, 1.85, 5.2, 1.1, size=66, bold=True, color=ACCENT, font=TITLE_FONT)
txt(s, "en las primeras 24 horas", 1.0, 3.0, 5.2, 0.4, size=18, color=INK)
txt(s, "GTA V · más de 11 millones de copias", 1.0, 3.55, 5.2, 0.4, size=14, color=MUTED)
txt(s, "$372M", 7.08, 1.85, 5.2, 1.1, size=66, bold=True, color=INK, font=TITLE_FONT)
txt(s, "Iron Man 3 · primer fin de semana", 7.08, 3.0, 5.2, 0.4, size=18, color=INK)
txt(s, "La película más taquillera del verano de 2013", 7.08, 3.55, 5.2, 0.4, size=14, color=MUTED)
txt(s, "Datos del artículo base (2013-2017). La lógica jurídica no ha cambiado; las cifras, sí.",
    0.7, 5.55, 11.9, 0.5, size=13, color=MUTED, italic=True)
page(s, 2)

# ---------- 03 · La pregunta ----------
s = new_slide()
kicker(s, "La pregunta")
rich(s, 0.7, 1.55, 11.9, 3.6, [
    {"t": "¿Quién es el dueño legal", "size": 54, "bold": True, "font": TITLE_FONT},
    {"t": "del último juego", "size": 54, "bold": True, "font": TITLE_FONT},
    {"t": "que jugaste?", "size": 54, "bold": True, "font": TITLE_FONT, "color": ACCENT},
])
txt(s, "Si no lo sabes, no estás solo.", 0.7, 5.45, 6, 0.5, size=24, color=MUTED)
txt(s, "?", 9.9, 4.8, 2.8, 2.0, size=200, bold=True, color=PANEL2, font=TITLE_FONT,
    align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
page(s, 3)

# ---------- 04 · La promesa ----------
s = new_slide()
kicker(s, "La promesa")
txt(s, "En tres horas no vas a salir siendo abogado.", 0.7, 1.5, 11.8, 0.8,
    size=34, bold=True, font=TITLE_FONT)
txt(s, "Vas a salir sabiendo qué preguntar, qué firmar y qué registrar.", 0.7, 2.4, 11.5, 0.5,
    size=20, color=MUTED)
cards = [
    ("01", "Un mapa de activos", "Quién es dueño de cada capa de tu juego."),
    ("02", "Un checklist de registro", "Qué registrar, en qué nombre y con qué prueba."),
    ("03", "Cinco cláusulas que salvan", "Lo que no puede faltar en tu próximo contrato."),
]
for i, (num, title, body) in enumerate(cards):
    x = 0.7 + i * 4.05
    shape(s, x, 3.45, 3.75, 2.55, fill=PANEL)
    txt(s, num, x + 0.3, 3.7, 1.0, 0.4, size=12, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, title, x + 0.3, 4.15, 3.1, 0.7, size=22, bold=True, font=TITLE_FONT)
    txt(s, body, x + 0.3, 4.95, 3.05, 0.8, size=15, color=MUTED)
page(s, 4)

# ---------- 05 · Agenda ----------
s = new_slide()
kicker(s, "El recorrido")
agenda = [
    ("0:00", "Apertura", "La pregunta que nadie sabe responder"),
    ("0:10", "Las capas", "Tu juego no es una obra: es un equipo"),
    ("0:25", "El caso", "Noche de Pixel: cinco socios, un pleito"),
    ("0:55", "Las puertas", "Software, multimedia, cine y la cuarta"),
    ("1:30", "El juicio", "El estudio que se partió"),
    ("2:10", "El taller", "Mapa, registro y contrato"),
    ("2:45", "El cierre", "Las cinco reglas de oro"),
]
for i, (t, title, body) in enumerate(agenda):
    y = 1.35 + i * 0.78
    txt(s, t, 0.7, y, 0.85, 0.35, size=12, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, title, 1.65, y - 0.04, 3.0, 0.4, size=18, bold=True, color=INK)
    txt(s, body, 4.75, y, 7.6, 0.4, size=15, color=MUTED)
    if i < len(agenda) - 1:
        shape(s, 0.7, y + 0.52, 11.9, 0.012, fill=SOFT, rounded=False)
page(s, 5)

# ---------- 06 · Sección 01 ----------
s = new_slide()
txt(s, "01", 9.7, 0.7, 3.0, 1.8, size=120, bold=True, color=PANEL, font=TITLE_FONT)
rich(s, 0.7, 3.65, 11.5, 2.2, [
    {"t": "Tu juego no es una obra.", "size": 46, "bold": True, "font": TITLE_FONT},
    {"t": "Es un equipo de obras que juegan juntas.", "size": 46, "bold": True,
     "font": TITLE_FONT, "color": ACCENT},
])
txt(s, "Y como todo equipo, tiene un problema de quién manda.", 0.7, 6.15, 10, 0.4,
    size=18, color=MUTED)
page(s, 6)

# ---------- 07 · Capas ----------
s = new_slide()
kicker(s, "Las capas")
txt(s, "Nueve capas. Nueve autores posibles.", 0.7, 1.0, 11.5, 0.7,
    size=36, bold=True, font=TITLE_FONT)
layers = [
    ("Código", "Programador o estudio"),
    ("Arte", "Ilustrador, modelador"),
    ("Música", "Compositor, intérpretes"),
    ("Historia", "Guionista, diseñador"),
    ("Diseño", "Game designer"),
    ("Voces", "Actores, doblaje"),
    ("UX", "Diseñador de interfaz"),
    ("Assets", "Terceros, licencias"),
    ("IA", "Herramientas, aporte humano"),
]
for i, (title, body) in enumerate(layers):
    col = i % 3
    row = i // 3
    x = 0.7 + col * 4.05
    y = 1.95 + row * 1.62
    shape(s, x, y, 3.75, 1.38, fill=PANEL)
    txt(s, title, x + 0.28, y + 0.2, 3.2, 0.4, size=20, bold=True, color=INK)
    txt(s, body, x + 0.28, y + 0.72, 3.2, 0.4, size=13, color=MUTED)
page(s, 7)

# ---------- 08 · El problema ----------
s = new_slide()
kicker(s, "El problema")
txt(s, "El mercado te vende el juego entero.", 0.7, 1.55, 5.6, 1.6,
    size=34, bold=True, font=TITLE_FONT)
txt(s, "La ley te lo protege por partes.", 7.0, 1.55, 5.6, 1.6,
    size=34, bold=True, font=TITLE_FONT, color=ACCENT)
shape(s, 0.7, 3.5, 5.55, 2.35, fill=PANEL)
shape(s, 7.0, 3.5, 5.55, 2.35, fill=PANEL)
txt(s, "Un precio. Un producto. Un comprador.", 1.0, 3.85, 5.0, 0.4, size=18, color=INK)
txt(s, "El estudio lo entrega todo junto: código, arte, música, historia.", 1.0, 4.45, 5.0, 0.9,
    size=15, color=MUTED)
txt(s, "Un registro por obra. Un titular por contrato.", 7.3, 3.85, 5.0, 0.4, size=18, color=INK)
txt(s, "El registro te pide que declares qué obra estás registrando.", 7.3, 4.45, 5.0, 0.9,
    size=15, color=MUTED)
txt(s, "Ahí nace el problema.", 0.7, 6.25, 8, 0.5, size=24, bold=True, color=ACCENT2)
page(s, 8)

# ---------- 09 · Ejercicio ----------
s = new_slide()
kicker(s, "Ejercicio · 3 minutos")
txt(s, "3:00", 0.7, 1.3, 3.2, 1.1, size=80, bold=True, color=ACCENT, font=TITLE_FONT)
rich(s, 0.7, 2.85, 8.8, 1.5, [
    {"t": "Toma el juego que más jugaste este año.", "size": 30, "bold": True, "font": TITLE_FONT},
    {"t": "Escribe cinco capas y, al lado, quién las creó.", "size": 30, "bold": True, "font": TITLE_FONT},
])
shape(s, 9.75, 1.45, 2.85, 3.3, fill=PANEL)
txt(s, "En parejas", 10.05, 1.75, 2.3, 0.4, size=16, bold=True, color=ACCENT)
txt(s, "No busquen la respuesta correcta. Busquen la respuesta real.", 10.05, 2.35, 2.25, 1.9,
    size=15, color=MUTED)
txt(s, "¿Quién lo creó?  ·  ¿Qué firmó?", 0.7, 5.15, 10, 0.5, size=24, color=INK)
page(s, 9)

# ---------- 10 · Transición ----------
s = new_slide()
kicker(s, "La pregunta del caso")
rich(s, 0.7, 1.55, 11.6, 4.2, [
    {"t": "Si cada capa tiene un dueño distinto,", "size": 42, "bold": True, "font": TITLE_FONT},
    {"t": "¿quién es el dueño del juego?", "size": 42, "bold": True, "font": TITLE_FONT,
     "color": ACCENT},
])
txt(s, "Vamos a verlo con un caso. Es ficticio. Los problemas son reales.", 0.7, 6.0, 10, 0.5,
    size=18, color=MUTED)
page(s, 10)

# ---------- 11 · Caso ----------
s = new_slide()
kicker(s, "Caso · ficticio, pero real")
txt(s, "Noche de Pixel", 0.7, 1.2, 8.0, 0.9, size=52, bold=True, font=TITLE_FONT)
rich(s, 0.7, 2.35, 7.4, 2.8, [
    {"t": "Cinco personas hicieron un juego que vendió un millón de copias.", "size": 21, "color": INK, "after": 12},
    {"t": "Ninguna firmó el contrato que debía.", "size": 21, "color": INK, "after": 12},
    {"t": "Hoy se pelean por todo.", "size": 21, "color": ACCENT, "bold": True},
])
shape(s, 8.55, 2.2, 4.0, 3.2, fill=PANEL)
txt(s, "1M", 8.85, 2.5, 3.4, 1.1, size=72, bold=True, color=ACCENT, font=TITLE_FONT)
txt(s, "copias vendidas", 8.85, 3.7, 3.4, 0.4, size=18, color=INK)
txt(s, "Un éxito. Un pleito. Un estudio que no sabía quién era dueño de qué.", 8.85, 4.3, 3.35, 0.9,
    size=14, color=MUTED)
txt(s, "Ustedes son el abogado que llega después.", 0.7, 5.85, 8, 0.5, size=20, color=ACCENT2)
page(s, 11)

# ---------- 12 · Personajes ----------
s = new_slide()
kicker(s, "Los personajes")
txt(s, "Cinco socios. Un publisher. Ningún mapa.", 0.7, 0.95, 11.5, 0.7,
    size=34, bold=True, font=TITLE_FONT)
people = [
    ("Valentina", "Diseñadora", "Concepto, historia y personajes"),
    ("Andrés", "Programador", "Motor PixelCore"),
    ("Camila", "Compositora", "Banda sonora original"),
    ("Julián", "Artista 3D", "Modelos, texturas, animación"),
    ("Sofía", "CEO", "Dinero y publisher"),
    ("Nightfall", "Publisher", "Inversión y publicación"),
]
for i, (name, role, body) in enumerate(people):
    col = i % 3
    row = i // 3
    x = 0.7 + col * 4.05
    y = 1.95 + row * 2.2
    shape(s, x, y, 3.75, 1.9, fill=PANEL)
    txt(s, name, x + 0.3, y + 0.22, 3.2, 0.5, size=24, bold=True, font=TITLE_FONT,
        color=ACCENT if i == 5 else INK)
    txt(s, role.upper(), x + 0.3, y + 0.8, 3.2, 0.3, size=10, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, body, x + 0.3, y + 1.2, 3.2, 0.5, size=14, color=MUTED)
page(s, 12)

# ---------- 13 · Aportes y documentos ----------
s = new_slide()
kicker(s, "Quién aportó qué")
rows = [
    ("Valentina", "Historia y personajes", "Ninguno. Cofundadora con 40%."),
    ("Andrés", "Motor PixelCore", "Ninguno. Cofundador con 30%."),
    ("Camila", "Música", "Contrato de una página: cede patrimoniales."),
    ("Julián", "Arte 3D", "Ninguno. Factura por asset."),
    ("Sofía", "Financiación y publicación", "Contrato con Nightfall."),
]
for i, (who, what, doc) in enumerate(rows):
    y = 1.45 + i * 0.95
    txt(s, who, 0.7, y, 2.0, 0.4, size=17, bold=True, color=ACCENT)
    txt(s, what, 2.85, y, 3.3, 0.4, size=17, color=INK)
    txt(s, doc, 6.35, y, 6.0, 0.4, size=14, color=MUTED)
    shape(s, 0.7, y + 0.6, 11.9, 0.012, fill=SOFT, rounded=False)
txt(s, "El documento que falta es el que decide el pleito.", 0.7, 6.45, 10, 0.4,
    size=18, italic=True, color=ACCENT2)
page(s, 13)

# ---------- 14 · La cláusula ----------
s = new_slide()
kicker(s, "La cláusula", color=ACCENT2)
rich(s, 0.7, 1.35, 11.8, 2.6, [
    {"t": "“Todos los derechos,", "size": 40, "bold": True, "font": TITLE_FONT},
    {"t": "incluidos los morales,", "size": 40, "bold": True, "font": TITLE_FONT, "color": ACCENT2},
    {"t": "a perpetuidad y en todo el universo.”", "size": 40, "bold": True, "font": TITLE_FONT},
])
txt(s, "¿Válido? ¿Ineficaz? ¿Parcial?", 0.7, 4.35, 10, 0.6, size=26, color=MUTED)
shape(s, 0.7, 5.35, 11.9, 1.1, fill=PANEL)
txt(s, "En Colombia, los derechos morales son inalienables. La cláusula, en esa parte, no produce efectos.",
    1.0, 5.65, 11.3, 0.5, size=16, color=INK)
page(s, 14)

# ---------- 15 · Trabajo en grupos ----------
s = new_slide()
kicker(s, "Trabajo en grupos")
txt(s, "10:00", 0.7, 1.15, 3.4, 1.0, size=76, bold=True, color=ACCENT, font=TITLE_FONT)
txt(s, "¿Quién es dueño de qué?", 0.7, 2.35, 8.5, 0.8, size=36, bold=True, font=TITLE_FONT)
rules = [
    ("No hay respuesta correcta.", "Hay argumentos."),
    ("Miren el contrato.", "No la buena intención."),
    ("Marquen el riesgo.", "No solo la teoría."),
]
for i, (a, b) in enumerate(rules):
    y = 3.65 + i * 0.9
    circle(s, 0.7, y + 0.04, 0.22, fill=ACCENT)
    txt(s, a, 1.15, y - 0.02, 4.8, 0.4, size=18, bold=True, color=INK)
    txt(s, b, 6.05, y - 0.02, 5.8, 0.4, size=18, color=MUTED)
page(s, 15)

# ---------- 16 · Las preguntas ----------
s = new_slide()
kicker(s, "Las preguntas")
qs = [
    "¿Quién es dueño de los personajes?",
    "¿Quién es dueño del motor?",
    "¿Quién es dueño de la música?",
    "¿Puede Valentina hacer la secuela?",
    "¿Puede Andrés licenciar PixelCore?",
    "¿Puede Nightfall usar la música en el spin-off?",
]
for i, q in enumerate(qs):
    col = i % 2
    row = i // 2
    x = 0.7 + col * 6.1
    y = 1.55 + row * 1.5
    txt(s, f"{i+1:02d}", x, y, 0.6, 0.4, size=12, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, q, x + 0.75, y - 0.05, 5.0, 0.9, size=20, bold=True, color=INK)
page(s, 16)

# ---------- 17 · Revelación ----------
s = new_slide()
kicker(s, "La revelación")
rich(s, 0.7, 1.4, 11.8, 4.6, [
    {"t": "“Es del estudio.”", "size": 38, "bold": True, "font": TITLE_FONT, "color": MUTED, "after": 4},
    {"t": "La respuesta común.", "size": 14, "color": MUTED, "after": 28},
    {"t": "“Depende.”", "size": 38, "bold": True, "font": TITLE_FONT, "color": INK, "after": 4},
    {"t": "La respuesta legal.", "size": 14, "color": MUTED, "after": 28},
    {"t": "“Depende de lo que firmaron.”", "size": 38, "bold": True, "font": TITLE_FONT,
     "color": ACCENT, "after": 4},
    {"t": "La respuesta práctica.", "size": 14, "color": MUTED},
])
page(s, 17)

# ---------- 18 · Sección 02 ----------
s = new_slide()
txt(s, "02", 9.7, 0.7, 3.0, 1.8, size=120, bold=True, color=PANEL, font=TITLE_FONT)
rich(s, 0.7, 3.55, 11.5, 2.3, [
    {"t": "Las tres puertas", "size": 50, "bold": True, "font": TITLE_FONT},
    {"t": "y la cuarta.", "size": 50, "bold": True, "font": TITLE_FONT, "color": ACCENT},
])
txt(s, "¿En qué cajón metemos el videojuego?", 0.7, 6.1, 10, 0.4, size=18, color=MUTED)
page(s, 18)

# ---------- 19 · Las cuatro puertas ----------
s = new_slide()
kicker(s, "Las cuatro rutas")
doors = [
    ("01", "Software", "El código como obra literaria.", "Deja fuera historia, arte y música."),
    ("02", "Multimedia", "La combinación, por partes.", "No es categoría autónoma."),
    ("03", "Cinematográfica", "La obra en colaboración.", "Analogía; no resuelve el código."),
    ("04", "Categoría propia", "El videojuego como un todo.", "Todavía no existe."),
]
for i, (num, title, body, caveat) in enumerate(doors):
    col = i % 2
    row = i // 2
    x = 0.7 + col * 6.1
    y = 1.45 + row * 2.55
    shape(s, x, y, 5.85, 2.2, fill=PANEL)
    txt(s, num, x + 0.3, y + 0.2, 0.6, 0.3, size=11, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, title, x + 0.3, y + 0.55, 5.2, 0.5, size=24, bold=True, font=TITLE_FONT,
        color=ACCENT if i == 3 else INK)
    txt(s, body, x + 0.3, y + 1.15, 5.2, 0.4, size=15, color=INK)
    txt(s, caveat, x + 0.3, y + 1.6, 5.2, 0.4, size=13, color=MUTED)
page(s, 19)

# ---------- 20 · Software ----------
s = new_slide()
kicker(s, "Puerta 01 · Software")
txt(s, "01", 0.7, 1.2, 2.4, 1.4, size=110, bold=True, color=PANEL2, font=TITLE_FONT)
txt(s, "El código es obra literaria.", 3.1, 1.35, 9.2, 0.7, size=38, bold=True, font=TITLE_FONT)
txt(s, "El código fuente es el texto; el código objeto es la traducción. Se registra y se licencia.",
    3.1, 2.15, 9.2, 0.8, size=18, color=MUTED)
bullets = [
    ("Protege", "La expresión del código: estructura, secuencia, organización."),
    ("No protege", "La historia, los personajes, la música, el arte."),
    ("Problema", "¿Quién es el autor? ¿El programador, el estudio o el freelance?"),
]
for i, (label, body) in enumerate(bullets):
    y = 3.35 + i * 1.05
    txt(s, label.upper(), 0.7, y, 2.0, 0.3, size=10, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, body, 2.85, y - 0.05, 9.5, 0.6, size=18, color=INK)
txt(s, "El software es el esqueleto. Un esqueleto no es una persona.", 0.7, 6.55, 11, 0.4,
    size=16, italic=True, color=ACCENT2)
page(s, 20)

# ---------- 21 · Multimedia ----------
s = new_slide()
kicker(s, "Puerta 02 · Multimedia")
rich(s, 0.7, 1.25, 11.8, 2.0, [
    {"t": "“Un videojuego contiene varias obras.", "size": 34, "bold": True, "font": TITLE_FONT},
    {"t": "En Colombia se registra por partes.”", "size": 34, "bold": True, "font": TITLE_FONT,
     "color": ACCENT},
])
txt(s, "Dirección Nacional de Derecho de Autor, guía oficial vigente.", 0.7, 3.3, 8, 0.3,
    size=12, color=MUTED, font=MONO_FONT)
# diagrama de fragmentación
shape(s, 0.7, 4.0, 3.5, 1.5, fill=PANEL)
txt(s, "UN JUEGO", 1.0, 4.35, 2.9, 0.4, size=16, bold=True, color=INK, font=MONO_FONT)
for i, label in enumerate(["Música", "Arte", "Código"]):
    x = 5.0 + i * 2.55
    shape(s, x, 4.0, 2.3, 1.5, fill=PANEL2)
    txt(s, label, x + 0.25, 4.45, 1.8, 0.4, size=16, bold=True, color=ACCENT)
    txt(s, "Registro y titular distinto", x + 0.25, 4.9, 1.8, 0.5, size=11, color=MUTED)
    # flecha
    ar = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(4.3), Inches(4.55), Inches(0.55), Inches(0.35))
    ar.fill.solid(); ar.fill.fore_color.rgb = SOFT; ar.line.fill.background(); ar.shadow.inherit = False
txt(s, "El camino de la fragmentación: el juego entero, pero en pedazos.", 0.7, 6.15, 11, 0.5,
    size=18, bold=True, color=ACCENT2)
page(s, 21)

# ---------- 22 · Cinematográfica ----------
s = new_slide()
kicker(s, "Puerta 03 · Obra cinematográfica")
txt(s, "El cine ya resolvió el problema.", 0.7, 1.1, 11.5, 0.7, size=36, bold=True, font=TITLE_FONT)
cols = [
    ("Director", "Derechos morales", "Paternidad, integridad, divulgación."),
    ("Productor", "Derechos patrimoniales", "Se presume titular, salvo pacto."),
    ("Coautores", "Su contribución", "Pueden usarla por otro medio, salvo pacto."),
]
for i, (title, label, body) in enumerate(cols):
    x = 0.7 + i * 4.05
    shape(s, x, 2.25, 3.75, 2.75, fill=PANEL)
    txt(s, title, x + 0.3, 2.5, 3.15, 0.5, size=24, bold=True, font=TITLE_FONT)
    txt(s, label.upper(), x + 0.3, 3.1, 3.15, 0.3, size=10, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, body, x + 0.3, 3.55, 3.15, 1.0, size=15, color=MUTED)
txt(s, "El artículo base reporta que Japón lo reconoce por jurisprudencia. Es su salida propuesta.", 0.7, 5.55, 11.5, 0.5,
    size=17, color=INK)
txt(s, "Pero el código sigue sin encajar del todo.", 0.7, 6.15, 11, 0.4, size=15, italic=True, color=ACCENT2)
page(s, 22)

# ---------- 23 · Categoría propia ----------
s = new_slide()
kicker(s, "Puerta 04 · La apuesta")
txt(s, "Una categoría propia:", 0.7, 1.2, 11.5, 0.8, size=40, bold=True, font=TITLE_FONT)
txt(s, "videojuego.", 0.7, 2.0, 11.5, 0.9, size=54, bold=True, font=TITLE_FONT, color=ACCENT)
points = [
    ("La tesis: la lista es enunciativa.", "No taxativa: cabe una obra nueva."),
    ("El registro no crea derechos.", "Solo prueba. La protección nace con la obra."),
    ("Es una tesis, no una verdad.", "Todavía no existe en la práctica registral."),
]
for i, (a, b) in enumerate(points):
    y = 3.5 + i * 0.95
    txt(s, f"0{i+1}", 0.7, y, 0.6, 0.3, size=11, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, a, 1.45, y - 0.05, 4.2, 0.4, size=18, bold=True, color=INK)
    txt(s, b, 5.85, y - 0.05, 6.5, 0.4, size=16, color=MUTED)
page(s, 23)

# ---------- 24 · Votación ----------
s = new_slide()
kicker(s, "Votación")
txt(s, "¿Por cuál puerta registrarías tu próximo juego?", 0.7, 1.1, 11.5, 0.8,
    size=32, bold=True, font=TITLE_FONT)
opts = ["Software", "Multimedia", "Cinematográfica", "Categoría propia"]
for i, opt in enumerate(opts):
    x = 0.7 + i * 3.05
    shape(s, x, 2.45, 2.8, 2.0, fill=PANEL)
    txt(s, f"0{i+1}", x + 0.25, 2.65, 0.6, 0.3, size=11, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, opt, x + 0.25, 3.1, 2.35, 0.9, size=17, bold=True, font=TITLE_FONT)
txt(s, "MANOS ARRIBA", 0.7, 5.15, 7, 0.6, size=28, bold=True, color=ACCENT, font=MONO_FONT)
page(s, 24)

# ---------- 25 · Respuesta ----------
s = new_slide()
kicker(s, "La respuesta")
rich(s, 0.7, 1.5, 11.8, 3.6, [
    {"t": "No hay una puerta única.", "size": 50, "bold": True, "font": TITLE_FONT},
    {"t": "Hay una estrategia por activo.", "size": 50, "bold": True, "font": TITLE_FONT, "color": ACCENT},
])
txt(s, "Y se diseña antes de firmar, no después de pelear.", 0.7, 5.5, 11, 0.6,
    size=22, color=MUTED)
page(s, 25)

# ---------- 26 · Pausa ----------
s = new_slide()
kicker(s, "Pausa")
txt(s, "15:00", 0.7, 1.2, 4.5, 1.4, size=90, bold=True, color=ACCENT, font=TITLE_FONT)
txt(s, "Volvemos a las [hora].", 0.7, 2.95, 8, 0.5, size=24, color=INK)
txt(s, "Mientras tanto: ¿quién es el dueño del juego que estás haciendo ahora?",
    0.7, 4.25, 10.5, 1.2, size=26, bold=True, font=TITLE_FONT)
page(s, 26)

# ---------- 27 · Juicio ----------
s = new_slide()
kicker(s, "Juicio simulado")
txt(s, "El estudio que se partió.", 0.7, 1.15, 11.5, 0.9, size=48, bold=True, font=TITLE_FONT)
parties = [
    ("Valentina", "La creadora", "Quiere la secuela."),
    ("Camila", "La compositora", "Quiere crédito y control."),
    ("Nightfall", "El publisher", "Dice que todo es suyo."),
]
for i, (name, role, claim) in enumerate(parties):
    x = 0.7 + i * 4.05
    shape(s, x, 2.55, 3.75, 2.35, fill=PANEL)
    txt(s, name, x + 0.3, 2.8, 3.15, 0.5, size=24, bold=True, font=TITLE_FONT,
        color=ACCENT2 if i == 2 else INK)
    txt(s, role.upper(), x + 0.3, 3.4, 3.15, 0.3, size=10, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, claim, x + 0.3, 3.85, 3.15, 0.6, size=15, color=MUTED)
txt(s, "El caso es ficticio. Las malas decisiones son reales.", 0.7, 5.55, 11, 0.5,
    size=18, italic=True, color=MUTED)
page(s, 27)

# ---------- 28 · Reglas del juicio ----------
s = new_slide()
kicker(s, "Las reglas")
steps = [
    ("3 min", "Apertura", "Cada lado"),
    ("5 min", "Testigo", "Directo y contra"),
    ("3 min", "Cierre", "Cada lado"),
    ("5 min", "Jurado", "Delibera"),
]
for i, (t, label, body) in enumerate(steps):
    x = 0.7 + i * 3.05
    shape(s, x, 1.9, 2.8, 2.1, fill=PANEL)
    txt(s, t, x + 0.25, 2.15, 2.3, 0.7, size=30, bold=True, color=ACCENT, font=TITLE_FONT)
    txt(s, label, x + 0.25, 2.95, 2.3, 0.4, size=18, bold=True, color=INK)
    txt(s, body, x + 0.25, 3.45, 2.3, 0.3, size=13, color=MUTED)
txt(s, "El juez corta. El jurado decide.", 0.7, 4.75, 10, 0.6, size=30, bold=True, font=TITLE_FONT)
txt(s, "Nadie gana. Eso es lo importante.", 0.7, 5.65, 10, 0.5, size=18, italic=True, color=ACCENT2)
page(s, 28)

# ---------- 29 · Tres preguntas ----------
s = new_slide()
kicker(s, "El veredicto")
txt(s, "Tres preguntas. Un veredicto.", 0.7, 1.1, 11.5, 0.8, size=38, bold=True, font=TITLE_FONT)
qs = [
    "¿Quién es dueño de los personajes?",
    "¿Quién es dueño del motor?",
    "¿Puede Nightfall usar la música sin permiso?",
]
for i, q in enumerate(qs):
    y = 2.55 + i * 1.25
    txt(s, f"0{i+1}", 0.7, y, 0.7, 0.4, size=13, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, q, 1.55, y - 0.1, 10.8, 0.8, size=26, bold=True, color=INK)
page(s, 29)

# ---------- 30 · Taller ----------
s = new_slide()
kicker(s, "Taller · 9 minutos por estación")
txt(s, "Tres estaciones. Un entregable.", 0.7, 1.0, 11.5, 0.8, size=38, bold=True, font=TITLE_FONT)
stations = [
    ("A", "Mapa de activos", "¿Quién es dueño de cada capa?"),
    ("B", "Registro express", "¿Qué registrar y en qué nombre?"),
    ("C", "Clínica de contratos", "¿Qué sobra y qué falta?"),
]
for i, (letter, title, body) in enumerate(stations):
    x = 0.7 + i * 4.05
    shape(s, x, 2.15, 3.75, 2.9, fill=PANEL)
    circle(s, x + 0.3, 2.45, 0.62, fill=ACCENT)
    txt(s, letter, x + 0.3, 2.55, 0.62, 0.4, size=20, bold=True, color=BG, font=TITLE_FONT,
        align=PP_ALIGN.CENTER)
    txt(s, title, x + 0.3, 3.3, 3.15, 0.7, size=20, bold=True, font=TITLE_FONT)
    txt(s, body, x + 0.3, 4.15, 3.15, 0.8, size=15, color=MUTED)
txt(s, "No se trata de llenarlo perfecto. Se trata de descubrir lo que no saben.",
    0.7, 5.65, 11, 0.5, size=17, italic=True, color=MUTED)
page(s, 30)

# ---------- 31 · Cinco reglas ----------
s = new_slide()
kicker(s, "Las cinco reglas de oro")
rules = [
    ("01", "Un juego, muchas obras.", "Inventario antes de firmar."),
    ("02", "La cesión se escribe.", "Lo que no se escribe, se pelea."),
    ("03", "El código también es obra.", "Se registra; el registro prueba."),
    ("04", "Los derechos morales no se venden.", "Los créditos se negocian."),
    ("05", "La categoría «videojuego» no existe.", "Diseña tu contrato, no esperes al registro."),
]
for i, (num, a, b) in enumerate(rules):
    y = 1.25 + i * 1.08
    txt(s, num, 0.7, y, 0.7, 0.3, size=11, bold=True, color=ACCENT, font=MONO_FONT)
    txt(s, a, 1.55, y - 0.08, 6.2, 0.5, size=21, bold=True, color=INK)
    txt(s, b, 7.95, y - 0.02, 4.7, 0.4, size=15, color=MUTED)
    if i < 4:
        shape(s, 0.7, y + 0.72, 11.9, 0.012, fill=SOFT, rounded=False)
page(s, 31)

# ---------- 32 · Cierre ----------
s = new_slide()
kicker(s, "La pregunta final")
rich(s, 0.7, 1.45, 11.8, 3.4, [
    {"t": "¿Quién es el dueño", "size": 52, "bold": True, "font": TITLE_FONT},
    {"t": "de tu juego?", "size": 52, "bold": True, "font": TITLE_FONT, "color": ACCENT},
])
txt(s, "Si no lo sabes, no es tu juego.", 0.7, 4.85, 11, 0.6, size=26, color=INK)
txt(s, "Es un pleito esperando fecha.", 0.7, 5.5, 11, 0.6, size=26, bold=True, color=ACCENT2)
page(s, 32)

# ---------- 33 · Gracias ----------
s = new_slide()
pixel_motif(s, 11.5, 0.55, 0)
txt(s, "Gracias.", 0.7, 1.5, 8, 1.1, size=90, bold=True, font=TITLE_FONT)
txt(s, "El handout se lo llevan. La pregunta se la llevan también.", 0.7, 3.0, 9, 0.6,
    size=20, color=MUTED)
shape(s, 0.7, 4.2, 5.85, 1.6, fill=PANEL)
txt(s, "Handout", 1.0, 4.45, 5.2, 0.4, size=14, bold=True, color=ACCENT, font=MONO_FONT)
txt(s, "Una página. Cinco reglas. Diez preguntas.", 1.0, 4.9, 5.2, 0.5, size=16, color=INK)
shape(s, 6.78, 4.2, 5.85, 1.6, fill=PANEL)
txt(s, "Contacto", 7.08, 4.45, 5.2, 0.4, size=14, bold=True, color=ACCENT, font=MONO_FONT)
txt(s, "[Correo]  ·  [QR]", 7.08, 4.9, 5.2, 0.5, size=16, color=INK)
txt(s, "Esta semana: inventario, contrato, registro.", 0.7, 6.35, 11, 0.4,
    size=16, italic=True, color=MUTED)
page(s, 33)

out = "conferencia-videojuegos.pptx"
prs.save(out)
print(f"OK: {out} ({len(prs.slides)} slides)")
