"""
Build the Business Orbit user guide.

Every screenshot is a real capture of the running product on a fresh
install, taken in the order somebody would actually meet the screens.
"""

import os
from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

SHOTS = os.path.join(os.path.dirname(__file__), "shots")
OUT = os.path.join(os.path.dirname(__file__), "..", "..", "Business-Orbit-User-Guide.pdf")

# The product's own palette, so the guide looks like the thing it describes.
INDIGO = colors.HexColor("#4f46e5")
INK = colors.HexColor("#14161f")
MUTED = colors.HexColor("#565e70")
SUBTLE = colors.HexColor("#696f7e")
LINE = colors.HexColor("#e5e7ef")
TINT = colors.HexColor("#eef1ff")
CANVAS = colors.HexColor("#f4f5fa")

PAGE_W, PAGE_H = A4
MARGIN = 18 * mm
CONTENT_W = PAGE_W - 2 * MARGIN
# Roughly half the usable height, so a step's words and its picture fit together.
MAX_FIGURE_H = 330

styles = getSampleStyleSheet()


def style(name, **kw):
    base = dict(fontName="Helvetica", fontSize=10.5, leading=15.5, textColor=INK, alignment=TA_LEFT)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    "title": style("title", fontName="Helvetica-Bold", fontSize=30, leading=34, textColor=INK),
    "subtitle": style("subtitle", fontSize=13.5, leading=19, textColor=MUTED),
    "part": style("part", fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=INDIGO,
                  spaceBefore=0, spaceAfter=4),
    "partsub": style("partsub", fontSize=11.5, leading=16.5, textColor=MUTED, spaceAfter=14),
    "h2": style("h2", fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=INK,
                spaceBefore=16, spaceAfter=5),
    "body": style("body", spaceAfter=7),
    "caption": style("caption", fontSize=8.8, leading=12.5, textColor=SUBTLE, spaceBefore=5),
    "note": style("note", fontSize=9.8, leading=14.5, textColor=MUTED),
    "cell": style("cell", fontSize=9.6, leading=13.5),
    "cellb": style("cellb", fontSize=9.6, leading=13.5, fontName="Helvetica-Bold"),
    "footer": style("footer", fontSize=8, textColor=SUBTLE),
}


def shot(name, crop=None, width=CONTENT_W):
    """Place a screenshot, optionally cropping a vertical band of it."""
    path = os.path.join(SHOTS, f"{name}.png")
    img = PILImage.open(path)
    w, h = img.size

    if crop:
        top, bottom = crop
        box = (0, int(h * top), w, int(h * bottom))
        img = img.crop(box)
        path = os.path.join(SHOTS, f"_{name}_{int(top*100)}_{int(bottom*100)}.png")
        img.save(path)
        w, h = img.size

    # Cap the height so a figure never takes a whole page on its own and
    # leaves the text it belongs to stranded on the one before.
    scale = width / w
    if h * scale > MAX_FIGURE_H:
        scale = MAX_FIGURE_H / h
    img_w, img_h = w * scale, h * scale
    picture = Image(path, width=img_w, height=img_h)
    picture.hAlign = "CENTER"
    return picture


def figure(name, caption, crop=None, width=CONTENT_W):
    """A screenshot and its caption, kept on one page. Always a list."""
    parts = [shot(name, crop, width)]
    if caption:
        parts.append(Paragraph(caption, S["caption"]))
    return [KeepTogether(parts), Spacer(1, 12)]


def steps(items):
    """A numbered list that reads as instructions."""
    rows = []
    for i, text in enumerate(items, 1):
        rows.append([
            Paragraph(f'<font color="#4f46e5"><b>{i}</b></font>', S["cell"]),
            Paragraph(text, S["cell"]),
        ])
    t = Table(rows, colWidths=[9 * mm, CONTENT_W - 9 * mm])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 3),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def callout(title, text):
    inner = [
        Paragraph(f"<b>{title}</b>", S["note"]),
        Spacer(1, 3),
        Paragraph(text, S["note"]),
    ]
    t = Table([[inner]], colWidths=[CONTENT_W])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), TINT),
        ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#c7cbf7")),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return t


def decorate(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(SUBTLE)
    if doc.page > 1:
        canvas.drawString(MARGIN, 12 * mm, "Business Orbit — user guide")
        canvas.drawRightString(PAGE_W - MARGIN, 12 * mm, str(doc.page))
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(MARGIN, 15 * mm, PAGE_W - MARGIN, 15 * mm)
    canvas.restoreState()


def cover(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(CANVAS)
    canvas.rect(0, 0, PAGE_W, PAGE_H, stroke=0, fill=1)
    canvas.setFillColor(INDIGO)
    canvas.roundRect(MARGIN, PAGE_H - MARGIN - 62, 62, 62, 14, stroke=0, fill=1)
    canvas.setFillColor(colors.white)
    canvas.setFont("Helvetica-Bold", 30)
    canvas.drawCentredString(MARGIN + 31, PAGE_H - MARGIN - 42, "BO")
    canvas.restoreState()


doc = BaseDocTemplate(
    OUT, pagesize=A4,
    leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=22 * mm,
    title="Business Orbit — user guide",
    author="Business Orbit",
    subject="A step-by-step guide for administrators, managers and employees",
)
frame = Frame(MARGIN, 22 * mm, CONTENT_W, PAGE_H - MARGIN - 22 * mm, id="body")
doc.addPageTemplates([
    PageTemplate(id="cover", frames=[frame], onPage=cover),
    PageTemplate(id="page", frames=[frame], onPage=decorate),
])

F = []
A = F.append

# ---------------------------------------------------------------- cover
A(NextPageTemplate("page"))
A(Spacer(1, 96))
A(Paragraph("Business Orbit", S["title"]))
A(Spacer(1, 8))
A(Paragraph("A step-by-step guide for everyone who uses it", S["subtitle"]))
A(Spacer(1, 26))
A(Paragraph(
    "This guide follows a brand new Business Orbit from the moment it is switched on: "
    "an empty system with one administrator, built up until work is flowing through it. "
    "Every screenshot is the real product, in the order you will meet it.",
    S["body"]))
A(Spacer(1, 18))
A(callout(
    "Three parts, one for each kind of person",
    "<b>Part 1</b> is for the administrator who sets the organisation up. "
    "<b>Part 2</b> is for anyone doing the work. "
    "<b>Part 3</b> is for whoever keeps an eye on it. "
    "Read your own part; it is the only one you need."))
A(PageBreak())

# ------------------------------------------------------- what this is
A(Paragraph("What Business Orbit is for", S["part"]))
A(Paragraph("The idea, in one page.", S["partsub"]))
A(Paragraph(
    "Most work inside a company moves by somebody remembering to chase it. A proposal is "
    "written, and then somebody has to remember to ask for a review. The review happens, and "
    "somebody has to remember to send it to the client. When a person is busy or away, the work "
    "stops and nobody notices until it is late.",
    S["body"]))
A(Paragraph(
    "Business Orbit is where you write the process down once, and the platform does the chasing. "
    "You describe the steps in order, say which kind of person does each one, and from then on "
    "every run of that process follows it. When somebody finishes their step, the next step "
    "appears on the right person's screen by itself.",
    S["body"]))
A(Spacer(1, 6))
A(callout(
    "The one idea worth holding on to",
    "A <b>workflow</b> is the recipe. A <b>run</b> is one use of it. You write the recipe once, "
    "and start a run every time that piece of work comes up."))
A(Spacer(1, 16))

A(Paragraph("The three kinds of account", S["h2"]))
A(Paragraph(
    "Everybody signs in to the same place and sees only what belongs to them. The difference is "
    "how much of the organisation they can see and change.",
    S["body"]))
A(Spacer(1, 6))

rows = [
    [Paragraph("<b>Account</b>", S["cellb"]),
     Paragraph("<b>What they see</b>", S["cellb"]),
     Paragraph("<b>What they can do</b>", S["cellb"])],
    [Paragraph("<b>Employee</b>", S["cellb"]),
     Paragraph("My Work — their own tasks, and nothing else.", S["cell"]),
     Paragraph("Do the steps assigned to them, raise new work, comment, upload files.", S["cell"])],
    [Paragraph("<b>Manager</b>", S["cellb"]),
     Paragraph("Their own work, plus the Board and the Overview across everybody.", S["cell"]),
     Paragraph("Everything an employee can, plus approve steps, reassign work and read the reports.", S["cell"])],
    [Paragraph("<b>Administrator</b>", S["cellb"]),
     Paragraph("All of the above, plus Workflows and Admin.", S["cell"]),
     Paragraph("Add people, create roles, build and publish workflows, set passwords.", S["cell"])],
]
t = Table(rows, colWidths=[28 * mm, 55 * mm, CONTENT_W - 83 * mm])
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("BACKGROUND", (0, 0), (-1, 0), TINT),
    ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
    ("TOPPADDING", (0, 0), (-1, -1), 8),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
]))
A(t)
A(Spacer(1, 12))
A(Paragraph(
    "An access level is not the same thing as a job. Somebody can be an employee who holds three "
    "workflow roles, or an administrator who holds none. The two are set separately.",
    S["note"]))
A(PageBreak())

# ============================================================ PART ONE
A(Paragraph("Part 1 — Administrator", S["part"]))
A(Paragraph("Setting up a brand new Business Orbit, from nothing.", S["partsub"]))
A(Paragraph(
    "When Business Orbit is first switched on it contains one person: you. There are no "
    "colleagues, no roles and no processes. This part walks through the four things that turn "
    "that into a working system. It takes about twenty minutes.",
    S["body"]))
A(Spacer(1, 10))

A(Paragraph("Step 1 — Sign in", S["h2"]))
A(Paragraph(
    "Open the address you were given and sign in with the email and password you were sent. "
    "There is no sign-up page on purpose: accounts are created for people, never by them.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("01-sign-in", "The sign-in page. Everybody starts here.", crop=(0.10, 0.80)))

A(Paragraph("Step 2 — Read the checklist", S["h2"]))
A(Paragraph(
    "The first thing you see is your own work — empty, because nothing has been set up yet. "
    "Above it is <b>Getting started</b>: four steps, in order, with the next one marked. Each step "
    "unlocks the one below it, because each genuinely depends on the last. The panel disappears "
    "on its own once all four are done.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("03-getting-started",
                "The setup checklist on a brand new system. Only the first step is available.",
                crop=(0.0, 0.50)))

A(Paragraph("Step 3 — Add the people", S["h2"]))
A(Paragraph(
    "Go to <b>Admin</b>. A workflow hands work to a person, so on your own there is nobody for it "
    "to reach — this is why it comes first. Press <b>Add a person</b> and fill in their name, "
    "email and a starting password.",
    S["body"]))
A(Spacer(1, 4))
A(steps([
    "Choose their <b>access level</b>: Employee for most people, Manager for anyone who needs to "
    "see across the team, Administrator only for those who set the system up.",
    "Set a starting password and tell them out of band — a message, not an email from the system. "
    "They can change it themselves from their profile afterwards.",
    "Phone, joining date, department and team are optional. You can add them later.",
]))
A(Spacer(1, 8))
F.extend(figure("06-add-person", "Adding somebody. Only the name, email and password are required.",
                crop=(0.05, 0.42)))

A(Paragraph("Step 4 — Create the roles", S["h2"]))
A(Paragraph(
    "This is the step people skip, and the one that makes everything else work. A stage of a "
    "workflow is never assigned to a person — it is assigned to a <b>role</b>, like Content Writer "
    "or Editor. The role is then held by whoever currently does that job.",
    S["body"]))
A(Spacer(1, 4))
A(callout(
    "Why it is worth the extra step",
    "When somebody leaves or goes on holiday, you move the role to somebody else and every "
    "workflow follows automatically. Nothing has to be edited and no running work breaks. "
    "If stages named people instead, you would be editing every process by hand."))
A(Spacer(1, 12))
F.extend(figure("08-add-role", "Creating a role. The name is all it needs.", crop=(0.72, 1.0)))

A(Paragraph("Step 5 — Give people their roles", S["h2"]))
A(Paragraph(
    "Back in the list of people, open somebody and tick the roles they hold, then press "
    "<b>Save roles</b>. Until a role has somebody active in it, any workflow routing work there "
    "will stall — so Business Orbit marks people with no roles in red until you do this.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("10-roles-assigned", "Each person now holds a role. Work can reach them.",
                crop=(0.10, 0.40)))

A(Paragraph("Step 6 — Build the workflow", S["h2"]))
A(Paragraph(
    "Go to <b>Workflows</b> and press <b>Create draft</b>. A draft is safe to experiment with: "
    "nothing can run on it until you publish it. Add your stages in order, and for each one say "
    "who does it, what they must record, and what happens when they finish.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("12-builder",
                "A three-stage process: write, review, publish. The review stage is an approval, "
                "so it offers Approve and Send back.",
                crop=(0.0, 0.46)))

A(Paragraph("Step 7 — Publish it", S["h2"]))
A(Paragraph(
    "Press <b>Publish</b>. Business Orbit checks the process holds together first — every stage "
    "has somebody to assign it to, every route leads somewhere, every approval says where "
    "rejected work goes — and tells you what to fix if not.",
    S["body"]))
A(Spacer(1, 4))
A(callout(
    "Published workflows never change underneath running work",
    "Once published, a version is fixed. Editing it creates version 2, and anything already "
    "running stays on the version it started with. Nobody ever has the process change halfway "
    "through their job."))
A(Spacer(1, 12))
F.extend(figure("13-published", "Version 1 is live. Work can now be started on it.",
                crop=(0.0, 0.62)))

# ============================================================ PART TWO
A(Paragraph("Part 2 — Doing the work", S["part"]))
A(Paragraph("For everybody. This is the part most people will only ever need.", S["partsub"]))
A(Paragraph(
    "If you are not setting the system up, this is your whole guide. There is one screen that "
    "matters, and it tells you what to do next.",
    S["body"]))
A(Spacer(1, 10))

A(Paragraph("Step 1 — My Work", S["h2"]))
A(Paragraph(
    "When you sign in you land on <b>My Work</b>. It shows what is waiting on you and nothing "
    "else. If it is empty, you genuinely have nothing to do — you do not need to check anywhere "
    "else, and you will be told when something arrives.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("14-employee-empty",
                "An employee with nothing waiting. The tabs sort your work by when it is needed.",
                crop=(0.0, 0.72)))

A(Paragraph("Step 2 — Raise a piece of work", S["h2"]))
A(Paragraph(
    "Press <b>Start a workflow</b>, choose the process and give this particular run a name — the "
    "client, the episode, the article. That name is how everybody will recognise it.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("15-start-a-workflow", "Starting one run of the Blog Post process.",
                crop=(0.12, 0.66)))

A(PageBreak())
A(Paragraph("Step 3 — Do your step", S["h2"]))
A(Paragraph(
    "The task page tells you what is needed and nothing more. At the top, where this run has got "
    "to. On the left, what to do and what to record. On the right, files, comments, and the full "
    "history of who did what.",
    S["body"]))
A(Spacer(1, 4))
A(steps([
    "Fields marked with a red asterisk have to be filled in before you can finish.",
    "<b>Save progress</b> keeps what you have typed without handing the work on. Use it freely.",
    "The line above the button tells you where the work goes next, and who gets it.",
    "If you are stuck waiting on somebody else, <b>Put this on hold</b> says so publicly rather "
    "than letting it look late.",
]))
A(Spacer(1, 8))
F.extend(figure("16-the-task", "A task, before anything has been entered.", crop=(0.0, 0.58)))

A(Paragraph("Step 4 — Hand it on", S["h2"]))
A(Paragraph(
    "Fill in what is asked and press <b>Complete</b>. That is the whole handover. The next stage "
    "opens on the right person's My Work immediately, and they are notified. You do not need to "
    "tell anybody.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("17-task-filled", "Filled in and ready. The button names the stage you are finishing.",
                crop=(0.22, 0.60)))
A(Spacer(1, 2))
A(callout(
    "If something is wrong with what you were sent",
    "A reviewer can send work back instead of approving it, with a note saying why. It returns to "
    "whoever did that earlier stage, with the note attached. Nothing is lost and nothing is "
    "started again from scratch."))

A(PageBreak())
A(Paragraph("Step 5 — The panels beside your work", S["h2"]))
A(Paragraph(
    "The right-hand side of a task page is the same on every stage, and it is where everything "
    "that is not a form lives.",
    S["body"]))
A(steps([
    "<b>Files</b> — anything attached to this run, not just to your stage. Some stages require a "
    "file before they can be finished, and say so. Uploading another copy of the same thing keeps "
    "both, numbered, rather than overwriting the first.",
    "<b>Comments</b> — a conversation attached to the work rather than to a chat thread. Anybody "
    "involved in the run can read it and add to it.",
    "<b>Activity history</b> — who did what, and when. It is added to and never edited, so it is "
    "the answer to what actually happened here.",
    "<b>If this cannot move</b> — put the work on hold when you are blocked. That says so "
    "publicly, instead of letting it quietly go late.",
]))
A(Spacer(1, 12))

A(Paragraph("Step 6 — Being told", S["h2"]))
A(Paragraph(
    "You do not have to keep checking. The bell in the header carries a count, and "
    "<b>Notifications</b> lists what has happened to work you are part of — a stage arriving with "
    "you, an approval you asked for, something sent back.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("28-notifications", "Notifications. The bell in the header carries the unread count.",
                crop=(0.0, 0.34)))

A(Paragraph("Step 7 — Your own account", S["h2"]))
A(Paragraph(
    "<b>Profile</b>, under your name, is your own summary: what you are carrying, the workflow "
    "roles you hold, and what your access level lets you do. It is also where you change your "
    "password — do that as soon as somebody sets one up for you.",
    S["body"]))
A(Spacer(1, 4))
A(callout(
    "Changing your password signs you out everywhere else",
    "Every other session is ended, which is the point: if somebody else had the old password, "
    "they lose it. You stay signed in where you are."))
A(Spacer(1, 12))
F.extend(figure("29-profile", "Your profile, with the password panel open.", crop=(0.0, 0.46)))

A(Paragraph("Step 8 — Finding something again", S["h2"]))
A(Paragraph(
    "The box at the top of every page searches people, projects, workflows, work, stages and "
    "files at once. Paste a permanent ID — anything shaped like BO-TSK-00012 — and it goes "
    "straight there.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("32-search", "One box for everything. An ID jumps straight to the record.",
                crop=(0.0, 0.42)))

# ========================================================== PART THREE
A(Paragraph("Part 3 — Keeping it moving", S["part"]))
A(Paragraph("For managers and administrators.", S["partsub"]))
A(Paragraph(
    "A manager does everything in Part 2 as well — their own work still arrives on My Work. What "
    "they have in addition is a view across everybody, and the ability to unstick things.",
    S["body"]))
A(Spacer(1, 10))

A(Paragraph("Approving somebody's work", S["h2"]))
A(Paragraph(
    "An approval stage arrives on your My Work like any other task. Open it, read what was done, "
    "work through any checklist, then <b>Approve</b> to send it on or <b>Send back</b> with a note.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("20-approval", "An approval waiting. The checklist must be completed first.",
                crop=(0.0, 0.52)))

A(Paragraph("Sending work back", S["h2"]))
A(Paragraph(
    "<b>Request changes</b> is the other half of an approval. It needs a note saying what is "
    "wrong, and it returns the work to the earlier stage the workflow nominates — with everything "
    "already entered still there. It is another pass, not a fresh start.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("30-approve-or-send-back",
                "The decision. The line above the buttons says where each choice sends the work.",
                crop=(0.30, 0.66)))

A(Paragraph("Moving work to somebody else", S["h2"]))
A(Paragraph(
    "When somebody is away or overloaded, open the task and press <b>Reassign</b>. Each candidate "
    "is listed with how much they are already carrying, so the choice is an informed one, and the "
    "reason is recorded on the timeline. Below it, <b>Cancel this workflow</b> stops a run that "
    "should not continue at all — it ends the whole run rather than this one stage, and the "
    "history stays readable afterwards.",
    S["body"]))
A(Spacer(1, 4))
A(callout(
    "This moves one task, not the role",
    "Reassigning affects that single piece of work. The stage still points at the role it was "
    "configured with, so the next run goes to whoever holds that role. To change it for good, "
    "move the role in Admin instead — that is what roles are for."))
A(Spacer(1, 12))
F.extend(figure("31-reassign",
                "Reassigning one task. Cancel this workflow, below it, stops the whole run.",
                crop=(0.16, 0.58)))

A(Paragraph("The Overview — what is happening right now", S["h2"]))
A(Paragraph(
    "<b>Overview</b> answers four questions, one per tab. <b>Now</b> is the state of play: what is "
    "running, what needs a decision, what is late, and who is carrying how much.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("22-overview", "The Now tab. Stuck work and upcoming deadlines are the two to watch.",
                crop=(0.0, 0.60)))

A(PageBreak())
A(Paragraph("The Board — work as a pipeline", S["h2"]))
A(Paragraph(
    "<b>Board</b> lays a workflow out left to right, one column per stage, one card per run. You "
    "can see at a glance where everything has got to. Stages with nothing in them fold away to a "
    "narrow strip so the board always fits the screen.",
    S["body"]))
A(Spacer(1, 4))
A(Paragraph(
    "Drag a card you hold onto the next column to complete that stage. Cards on somebody else's "
    "stage are marked with a padlock and stay put — the board is a faster way to do the same "
    "thing, never a way around the process.",
    S["body"]))
A(Spacer(1, 6))
F.extend(figure("23-board", "Three runs of Blog Post. Empty stages are folded to the left.",
                crop=(0.0, 0.52)))

A(Paragraph("The Team — who is carrying what", S["h2"]))
A(Paragraph(
    "<b>Team</b> is one row per person: how much they have open, how much is due today, what is "
    "overdue, and what is waiting on their approval. Anyone carrying overdue work appears first.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("24-team", "Workload across everybody. Click a name to see their work.",
                crop=(0.0, 0.56)))

A(Paragraph("Projects — one initiative at a time", S["h2"]))
A(Paragraph(
    "A <b>Major Project</b> groups runs that belong to the same initiative, and gives it its own "
    "colour so work from several shows apart on a shared screen. Its page is the same questions "
    "asked of one project only.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("33-project", "One project: what is running inside it, and what has finished.",
                crop=(0.0, 0.52)))

A(Paragraph("The Reports — how long things really take", S["h2"]))
A(Paragraph(
    "<b>Reports</b> is the one that changes how you work. <b>Where the time goes</b> lists every "
    "stage slowest first, with how often it is sent back for changes. That is where a process is "
    "worth fixing.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("26-reports", "Slowest stage first. Rework and lateness are counted per stage.",
                crop=(0.0, 0.56)))

A(PageBreak())

A(PageBreak())
A(Paragraph("Part 4 — The administrator's other jobs", S["part"]))
A(Paragraph("Occasional, but somebody has to know where they are.", S["partsub"]))
A(Paragraph(
    "Setting up is the long part and it happens once. These are the things that come up "
    "afterwards, a few times a year each.",
    S["body"]))
A(Spacer(1, 10))

A(Paragraph("When somebody joins, leaves or forgets their password", S["h2"]))
A(steps([
    "<b>Set password</b> gives somebody a new one when they are locked out. There is no reset "
    "email, so this is the way back in. Tell them out of band, and they can change it themselves.",
    "<b>Deactivate</b> is how somebody leaves. Nothing is deleted — their name stays on the "
    "history they made — but they cannot sign in, and work stops being routed to them.",
    "Before deactivating, move their roles to whoever is taking over. A role with nobody active "
    "in it stalls every workflow that routes to it.",
]))
A(Spacer(1, 8))
F.extend(figure("35-admin-people", "Each person carries their roles, and the two buttons above.",
                crop=(0.13, 0.42)))

A(Paragraph("Departments, teams and projects", S["h2"]))
A(Paragraph(
    "None of these are required to run work, which is why setting up skips them. They are for "
    "grouping: departments and teams describe the organisation, and a <b>Major Project</b> groups "
    "runs that belong to the same initiative. Nothing here can be deleted while a person or a "
    "workflow still points at it — set it inactive instead, and the history stays readable.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("36-admin-structure", "The optional structure, below the people.",
                crop=(0.42, 0.72)))

A(Paragraph("Changing a workflow that is already live", S["h2"]))
A(Paragraph(
    "Press <b>Edit as new version</b>. You get a draft copy to change and publish, and anything "
    "already running carries on under the version it started with. That is deliberate: nobody "
    "should have the process change halfway through their job.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("37-new-version", "A live workflow. Editing it makes version 2, never changes version 1.",
                crop=(0.0, 0.60)))

A(PageBreak())
A(Paragraph("Help inside the product", S["part"]))
A(Paragraph("For when this guide is not to hand.", S["partsub"]))
A(Paragraph(
    "The <b>?</b> in the header opens <b>How this works</b> — the same ideas as this guide, kept "
    "beside the product so it cannot drift out of date on somebody's desktop. It also offers a "
    "practice run: a sandbox workflow that behaves like a real one and can be thrown away.",
    S["body"]))
A(Spacer(1, 4))
F.extend(figure("34-help", "The built-in explanation, and the practice run beside it.",
                crop=(0.0, 0.50)))

# ------------------------------------------------------------ glossary
A(Paragraph("The words this guide uses", S["part"]))
A(Paragraph("Six terms, and then you know the whole vocabulary.", S["partsub"]))

glossary = [
    ("Workflow", "A process, written down once. Blog Post, Proposal Creation, Client Onboarding. "
                 "It lists the stages in order and who does each one."),
    ("Version", "Workflows are numbered. Publishing fixes a version; editing it creates the next "
                "one. Work already running stays on the version it started with."),
    ("Stage", "One step of a workflow. It has somebody responsible, things they must record, and "
              "a deadline measured from the moment it opens."),
    ("Role", "What a stage is assigned to — Content Writer, Editor — rather than a named person. "
             "Move the role to somebody else and every workflow follows."),
    ("Run", "One use of a workflow. 'Pricing page rewrite' is a run of Blog Post. Each run has its "
            "own name, its own deadline and its own history."),
    ("Task", "One stage of one run, sitting with one person. A task is what appears on My Work."),
]
rows = [[Paragraph(f"<b>{term}</b>", S["cellb"]), Paragraph(text, S["cell"])] for term, text in glossary]
t = Table(rows, colWidths=[30 * mm, CONTENT_W - 30 * mm])
t.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
    ("TOPPADDING", (0, 0), (-1, -1), 9),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
]))
A(t)
A(Spacer(1, 18))
A(callout(
    "If you remember nothing else",
    "Work arrives on <b>My Work</b>. Finish your step and press <b>Complete</b>. "
    "The next person is told automatically. Everything else in this guide is detail."))

doc.build(F)
print("written:", os.path.abspath(OUT))
