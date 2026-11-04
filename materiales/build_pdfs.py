# -*- coding: utf-8 -*-
"""Genera los PDFs imprimibles de la conferencia."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table,
                                TableStyle, PageBreak, KeepTogether)

DARK = colors.HexColor("#0B0E13")
ACCENT = colors.HexColor("#4F6B00")
ACCENT_LIGHT = colors.HexColor("#E8F5C8")
GRAY = colors.HexColor("#555B66")
LIGHT = colors.HexColor("#F2F2EE")
LINE = colors.HexColor("#D9D9D2")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", fontName="Helvetica-Bold", fontSize=30,
                          leading=34, textColor=DARK, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", fontName="Helvetica", fontSize=13,
                          leading=18, textColor=GRAY, spaceAfter=4))
styles.add(ParagraphStyle(name="H1x", fontName="Helvetica-Bold", fontSize=17,
                          leading=21, textColor=DARK, spaceBefore=12, spaceAfter=6))
styles.add(ParagraphStyle(name="H2x", fontName="Helvetica-Bold", fontSize=11,
                          leading=14, textColor=ACCENT, spaceBefore=8, spaceAfter=3))
styles.add(ParagraphStyle(name="Bodyx", fontName="Helvetica", fontSize=10,
                          leading=14, textColor=DARK, spaceAfter=4))
styles.add(ParagraphStyle(name="Smallx", fontName="Helvetica", fontSize=8,
                          leading=11, textColor=GRAY))
styles.add(ParagraphStyle(name="Quotex", fontName="Helvetica-Oblique", fontSize=10,
                          leading=14, textColor=DARK, leftIndent=12,
                          borderPadding=6, backColor=LIGHT, spaceBefore=4, spaceAfter=6))
styles.add(ParagraphStyle(name="Bulletx", fontName="Helvetica", fontSize=10,
                          leading=14, textColor=DARK, leftIndent=14, bulletIndent=4,
                          spaceAfter=2))

CELL = ParagraphStyle(name="Cell", fontName="Helvetica", fontSize=7.8,
                      leading=10, textColor=DARK)
CELL_B = ParagraphStyle(name="CellB", fontName="Helvetica-Bold", fontSize=7.8,
                        leading=10, textColor=colors.white)


def ptable(data, colWidths, header=True):
    rows = []
    for r, row in enumerate(data):
        rows.append([Paragraph(str(c), CELL_B if (header and r == 0) else CELL) for c in row])
    t = Table(rows, colWidths=colWidths)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
    ]))
    return t


def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(GRAY)
    canvas.drawString(2 * cm, A4[1] - 1.2 * cm, "CONFERENCIA · ¿DE QUIÉN ES TU VIDEOJUEGO?")
    canvas.drawRightString(A4[0] - 2 * cm, A4[1] - 1.2 * cm, "MATERIAL DEL PARTICIPANTE")
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(2 * cm, A4[1] - 1.35 * cm, A4[0] - 2 * cm, A4[1] - 1.35 * cm)
    canvas.drawString(2 * cm, 1.1 * cm, "Material educativo. No constituye asesoría legal personalizada.")
    canvas.drawRightString(A4[0] - 2 * cm, 1.1 * cm, f"{doc.page}")
    canvas.restoreState()


def cover(title, subtitle, note):
    story = []
    story.append(Spacer(1, 2.2 * cm))
    story.append(Paragraph("CONFERENCIA · 3 HORAS", styles["Smallx"]))
    story.append(Spacer(1, 0.3 * cm))
    story.append(Paragraph(title, styles["CoverTitle"]))
    story.append(Paragraph(subtitle, styles["CoverSub"]))
    story.append(Spacer(1, 0.8 * cm))
    t = Table([[""]], colWidths=[17 * cm], rowHeights=[0.18 * cm])
    t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), ACCENT)]))
    story.append(t)
    story.append(Spacer(1, 0.6 * cm))
    story.append(Paragraph(note, styles["Bodyx"]))
    story.append(PageBreak())
    return story


def bullets(items):
    return [Paragraph(f"• {x}", styles["Bulletx"]) for x in items]


# =========================================================
# 1. Cuaderno del participante
# =========================================================
doc = SimpleDocTemplate("cuaderno-del-participante.pdf", pagesize=A4,
                        leftMargin=2 * cm, rightMargin=2 * cm,
                        topMargin=2 * cm, bottomMargin=1.8 * cm,
                        title="¿De quién es tu videojuego? — Cuaderno del participante",
                        author="La Casa")

story = cover(
    "¿De quién es tu videojuego?",
    "Derecho de autor para creadores: cómo proteger lo que haces antes de que alguien más lo registre.",
    "En tres horas no vas a salir siendo abogado. Vas a salir sabiendo qué preguntar, qué firmar y qué registrar. "
    "Este cuaderno es suyo: úselo durante el caso, el juicio y el taller."
)

story.append(Paragraph("Las cinco reglas de oro", styles["H1x"]))
story.extend(bullets([
    "<b>Un juego, muchas obras.</b> Código, arte, música, historia, diseño, voces, UX. Inventario antes de firmar.",
    "<b>La cesión se escribe.</b> Lo que no se escribe, se pelea. Y lo que se escribe mal, también.",
    "<b>El código también es obra.</b> Se protege como obra literaria y se registra. El registro prueba; no crea derechos.",
    "<b>Los derechos morales no se venden.</b> La paternidad y la integridad se respetan. Los créditos se negocian.",
    "<b>La categoría «videojuego» todavía no existe.</b> No esperes que el registro te salve; diseña tu contrato.",
]))

story.append(Paragraph("Tu mapa de activos", styles["H1x"]))
story.append(Paragraph("Complete una fila por cada capa de su juego. Si no puede llenar una fila, esa es su primera tarea.", styles["Bodyx"]))
data = [["Activo", "¿Quién lo creó?", "¿Contrato?", "¿Registro?", "Riesgo", "Acción"]]
for _ in range(10):
    data.append(["", "", "", "", "", ""])
story.append(ptable(data, colWidths=[3.1 * cm, 3.1 * cm, 2.5 * cm, 2.3 * cm, 1.6 * cm, 4.4 * cm]))

story.append(Paragraph("Las tres puertas (y la cuarta)", styles["H1x"]))
data = [
    ["Puerta", "Qué protege", "Qué deja por fuera"],
    ["Software", "El código como obra literaria.", "Historia, personajes, música, arte."],
    ["Multimedia", "La combinación, por partes.", "No es categoría autónoma en Colombia; fragmenta el registro."],
    ["Cinematográfica", "La obra en colaboración, con director y productor.", "No resuelve del todo el código; es analogía."],
    ["Categoría propia", "El videojuego como un todo.", "Todavía no existe en la práctica registral."],
]
story.append(ptable(data, colWidths=[3.2 * cm, 6.4 * cm, 7.4 * cm]))
story.append(Paragraph("Estrategia: no elijas una puerta para todo. Elige una ruta por activo.", styles["Quotex"]))

story.append(Paragraph("Las cinco cláusulas que no pueden faltar", styles["H1x"]))
story.extend(bullets([
    "<b>Cesiones de derechos patrimoniales:</b> qué, para qué usos, en qué territorio, por cuánto tiempo, por cuánto dinero.",
    "<b>Obra en colaboración:</b> quién conserva qué contribución y cómo se autoriza su uso separado.",
    "<b>Licencia de motor:</b> si el código es tuyo, se licencia; no se regala. Si es de otro, se licencia por escrito.",
    "<b>Créditos y derechos morales:</b> cómo se acredita, cómo se corrige, qué no se puede alterar.",
    "<b>Assets de terceros y IA:</b> qué licencia tiene cada asset, quién responde y qué se puede registrar.",
]))

story.append(Paragraph("Diez preguntas antes de firmar", styles["H1x"]))
story.extend(bullets([
    "¿Quién es el autor en el contrato?",
    "¿Qué derechos cedo: patrimoniales, morales o ambos?",
    "¿El plazo es definido o «para siempre»?",
    "¿El territorio es Colombia o «todo el universo»?",
    "¿La contraprestación cubre usos futuros?",
    "¿Tengo derecho a crédito?",
    "¿Puedo reutilizar mi contribución en otro proyecto?",
    "¿Qué pasa si el proyecto se cancela?",
    "¿Quién responde si el asset infringe derechos de terceros?",
    "¿Hay reversión si el estudio no explota la obra?",
]))

story.append(Paragraph("Para llevar", styles["H1x"]))
story.append(Paragraph("El registro no crea derechos; los prueba. Es una fotografía, no un título de propiedad.", styles["Quotex"]))
story.append(Paragraph("El contrato es el mapa. Sin mapa, cada quien cree que es dueño de la casa.", styles["Quotex"]))
story.append(Paragraph("Esta semana, tres cosas: inventario de activos; revisión del contrato de cada colaborador; registro del código y de las obras principales.", styles["Bodyx"]))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)

# =========================================================
# 2. Caso Noche de Pixel
# =========================================================
doc = SimpleDocTemplate("caso-noche-de-pixel.pdf", pagesize=A4,
                        leftMargin=2 * cm, rightMargin=2 * cm,
                        topMargin=2 * cm, bottomMargin=1.8 * cm,
                        title="Caso Noche de Pixel",
                        author="La Casa")

story = cover(
    "Noche de Pixel",
    "Caso guía y juicio simulado",
    "Caso ficticio, construido con problemas reales de la industria. Cualquier parecido con estudios o personas reales es coincidencia. No es asesoría legal."
)

story.append(Paragraph("Los hechos", styles["H1x"]))
story.append(Paragraph(
    "En 2021, <b>Valentina Ríos</b> y <b>Andrés Molina</b> fundaron <b>Pixel Dorado S.A.S.</b> en Bogotá. "
    "Valentina había creado, en un cuaderno, el universo de <i>Noche de Pixel</i>: una ciudad donde los recuerdos "
    "se compran y se venden. Andrés trajo <b>PixelCore</b>, un motor que había construido en la universidad para su tesis.",
    styles["Bodyx"]))
story.append(Paragraph(
    "En 2022 se sumó <b>Camila Duarte</b>, compositora, con un contrato de prestación de servicios de una página. "
    "En 2023 se sumó <b>Julián Vera</b>, artista 3D, pagado por asset producido, sin contrato escrito. En 2024 llegó "
    "<b>Sofía Londoño</b> como CEO y consiguió una inversión de <b>Nightfall Games</b>, un publisher extranjero, por 250.000 dólares.",
    styles["Bodyx"]))
story.append(Paragraph(
    "El contrato de publicación se firmó en inglés, con una cláusula que decía: <i>«The Developer hereby assigns to the "
    "Publisher, in perpetuity and worldwide, all intellectual property rights, including moral rights, in and to the Game "
    "and all its components.»</i>", styles["Bodyx"]))
story.append(Paragraph(
    "<i>Noche de Pixel</i> salió en 2025. Vendió un millón de copias. Ganó premios independientes. Y entonces todo se rompió: "
    "Valentina renunció y anunció una secuela con los mismos personajes; Andrés recibió una oferta para licenciar PixelCore; "
    "Camila descubrió que su música se usó en el tráiler de un spin-off móvil sin aviso; Julián descubrió sus modelos en "
    "camisetas y figuras de colección. Sofía dice que todo es del estudio. Nightfall dice que el contrato es claro: todo es suyo.",
    styles["Bodyx"]))

story.append(Paragraph("Los personajes", styles["H1x"]))
data = [
    ["Personaje", "Aporte", "Documento que firmó"],
    ["Valentina Ríos", "Concepto, historia, personajes, diseño de niveles", "Ninguno. Cofundadora con 40%."],
    ["Andrés Molina", "Motor PixelCore y programación", "Ninguno. Cofundador con 30%."],
    ["Camila Duarte", "Banda sonora original", "Contrato de servicios: «cedo todos los derechos sobre los entregables»."],
    ["Julián Vera", "Modelos 3D, texturas, animaciones", "Ninguno. Factura por asset. Usó assets comprados y texturas de IA."],
    ["Sofía Londoño", "CEO, financiación, publicación", "Contrato de publicación con Nightfall."],
    ["Nightfall Games", "Inversión y publicación", "Contrato de publicación."],
]
story.append(ptable(data, colWidths=[3.1 * cm, 6.0 * cm, 7.9 * cm]))

story.append(Paragraph("Los documentos", styles["H1x"]))
story.append(Paragraph("<b>Documento 1 — Extracto del contrato de publicación.</b>", styles["Bodyx"]))
story.append(Paragraph("«3.1 El Desarrollador cede al Editor, de manera perpetua, mundial e irrevocable, todos los derechos de propiedad intelectual sobre el Juego y todos sus componentes, incluidos los derechos morales. 3.2 El Editor podrá explotar el Juego, sus secuelas, precuelas, adaptaciones, remasterizaciones, spin-offs y productos derivados, en cualquier medio conocido o por conocer. 7.4 El Desarrollador conserva el 30% de las regalías netas y el 20% del capital social.»", styles["Quotex"]))
story.append(Paragraph("<b>Documento 2 — Correo de Sofía a Andrés (2024).</b>", styles["Bodyx"]))
story.append(Paragraph("«Andrés, no te preocupes por la licencia del motor. Somos familia. Nadie va a usar PixelCore fuera del estudio. Sigamos.»", styles["Quotex"]))
story.append(Paragraph("<b>Documento 3 — Certificado de registro de software.</b>", styles["Bodyx"]))
story.append(Paragraph("Obra: «PixelCore — motor y código del juego Noche de Pixel». Titular: Pixel Dorado S.A.S. Autor: Andrés Molina. Fecha: 2024.", styles["Quotex"]))
story.append(Paragraph("<b>Documento 4 — Créditos del juego.</b>", styles["Bodyx"]))
story.append(Paragraph("Diseño de juego: Valentina Ríos. Programación: Andrés Molina. Música: Camila Duarte. Arte: Julián Vera. Producción: Sofía Londoño. Un juego de Pixel Dorado S.A.S. Publicado por Nightfall Games.", styles["Quotex"]))
story.append(Paragraph("<b>Documento 5 — Contrato de Camila (2022).</b>", styles["Bodyx"]))
story.append(Paragraph("«La Contratista prestará servicios de composición musical para el proyecto Noche de Pixel. Cede al Estudio todos los derechos patrimoniales sobre las obras entregadas, para su explotación en el juego y su comercialización. La contraprestación será de 8.000.000 COP, pagaderos contra entrega.»", styles["Quotex"]))
story.append(Paragraph("<b>Documento 6 — Mensaje de Julián en Slack (2023).</b>", styles["Bodyx"]))
story.append(Paragraph("«Chicos, las texturas de la ciudad las generé con una herramienta de IA y las retoqué a mano. No sé si eso se puede registrar. ¿Alguien revisó los términos de la herramienta?»", styles["Quotex"]))

story.append(Paragraph("Preguntas para los grupos", styles["H1x"]))
story.extend(bullets([
    "¿Quién es dueño de los personajes?",
    "¿Quién es dueño del motor PixelCore?",
    "¿Quién es dueño de la música?",
    "¿Puede Valentina hacer una secuela con los mismos personajes?",
    "¿Puede Andrés licenciar PixelCore a otro estudio?",
    "¿Puede Nightfall usar la música de Camila en el spin-off?",
    "¿Qué pasa con los derechos morales de cada uno?",
    "¿Qué debió hacer cada personaje para evitar el pleito?",
]))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)

# =========================================================
# 3. Tarjetas de rol
# =========================================================
doc = SimpleDocTemplate("roles-juicio.pdf", pagesize=A4,
                        leftMargin=2 * cm, rightMargin=2 * cm,
                        topMargin=2 * cm, bottomMargin=1.8 * cm,
                        title="Roles del juicio simulado",
                        author="La Casa")

roles = [
    ("ABOGADO DE VALENTINA", "Usted representa a la creadora del concepto, la historia y los personajes. Su cliente nunca firmó un contrato de cesión. Argumente: (1) la autoría es suya; (2) la sociedad no puede ser dueña de lo que no le cedió; (3) la secuela es continuación de su obra; (4) los derechos morales siguen en cabeza de ella. Pida que se reconozca su autoría y que se le permita hacer la secuela, o que se le pague una licencia."),
    ("ABOGADO DE CAMILA", "Usted representa a la compositora. Ella firmó un contrato que cede los derechos patrimoniales «para el juego y su comercialización». Argumente: (1) el spin-off móvil excede ese alcance; (2) no se le dio crédito, lo que afecta el derecho moral de paternidad; (3) la música se alteró sin su consentimiento. Pida el cese del uso, el crédito y una compensación."),
    ("ABOGADO DE NIGHTFALL", "Usted representa al publisher que puso el dinero. Argumente: (1) el contrato cede todos los derechos, incluidos los morales; (2) sin la inversión no habría juego; (3) la secuela es una obra derivada y requiere su autorización; (4) el estudio no puede licenciar el motor sin su consentimiento. Pida que se declare la validez de la cesión y se prohíba la secuela."),
    ("ABOGADO DE SOFÍA / PIXEL DORADO", "Usted representa a la CEO y a la sociedad. Argumente: (1) el estudio es el titular de los derechos patrimoniales; (2) Andrés desarrolló PixelCore con recursos de la sociedad; (3) el correo de Sofía demuestra que había un acuerdo de uso; (4) el registro del software está a nombre de la sociedad. Pida que se reconozca la titularidad del estudio."),
    ("TESTIGO VALENTINA", "Usted creó el universo, los personajes y la historia. Nunca firmó nada. Recuerde detalles concretos: el cuaderno, los bocetos, las versiones del guion. Admita que no tuvo abogado. Emocione, pero no invente."),
    ("TESTIGO ANDRÉS", "Usted creó PixelCore en la universidad, antes de la sociedad. Tiene el repositorio y los commits. Prestó el motor al estudio sin licencia escrita. El correo de Sofía decía «somos familia». Defienda que el motor es suyo, pero admita que lo adaptó para el juego."),
    ("TESTIGO CAMILA", "Usted firmó un contrato de una página. La música se usó en un tráiler de un spin-off sin su permiso. No la acreditaron. Tiene los correos y el enlace. Defienda su autoría y su derecho al crédito."),
    ("JUEZ", "Dirija la audiencia. Cada parte tiene tres minutos para la apertura; cada testigo, cinco; cada cierre, tres. El jurado delibera cinco minutos y decide tres cosas: quién es dueño de los personajes, quién es dueño del motor y qué pasa con la música en el spin-off. No permita ataques personales. Corte sin piedad."),
]

story = cover(
    "Roles del juicio",
    "El estudio que se partió",
    "Recorte las tarjetas y repártalas. El caso es ficticio; las malas decisiones son reales."
)

for i, (title, body) in enumerate(roles):
    card = Table([[Paragraph(title, ParagraphStyle(name=f"rt{i}", fontName="Helvetica-Bold", fontSize=10, leading=13, textColor=ACCENT))],
                  [Paragraph(body, ParagraphStyle(name=f"rb{i}", fontName="Helvetica", fontSize=9, leading=12.5, textColor=DARK))]],
                 colWidths=[17 * cm])
    card.setStyle(TableStyle([
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(KeepTogether([card, Spacer(1, 0.35 * cm)]))
    if i == 3:
        story.append(PageBreak())

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)

print("OK: cuaderno-del-participante.pdf, caso-noche-de-pixel.pdf, roles-juicio.pdf")
