from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)


OUT = Path(r"D:\仕事用\5_その他\mainichi\design\LIFE_NOTE_デザインシステムと実装ロードマップ_v1.pdf")

INK = "#132238"
MUTED = "#5F7189"
LINE = "#D9E2EC"
SURFACE = "#F6F8FB"
BLUE = "#4B9FE8"
GREEN = "#34B98B"
CORAL = "#F27D78"
VIOLET = "#9577DD"
YELLOW = "#F1BE48"
RED = "#D95055"


def register_fonts():
    regular = r"C:\Windows\Fonts\YuGothM.ttc"
    bold = r"C:\Windows\Fonts\YuGothB.ttc"
    pdfmetrics.registerFont(TTFont("YuGothic", regular, subfontIndex=0))
    pdfmetrics.registerFont(TTFont("YuGothic-Bold", bold, subfontIndex=0))


def make_styles():
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("body", parent=base["BodyText"], fontName="YuGothic", fontSize=9.3, leading=15, textColor=colors.HexColor(INK), spaceAfter=5),
        "small": ParagraphStyle("small", parent=base["BodyText"], fontName="YuGothic", fontSize=7.7, leading=11.4, textColor=colors.HexColor(MUTED)),
        "cover_brand": ParagraphStyle("cover_brand", parent=base["BodyText"], fontName="YuGothic-Bold", fontSize=13, leading=16, textColor=colors.HexColor(BLUE), alignment=TA_CENTER, spaceAfter=9),
        "cover_title": ParagraphStyle("cover_title", parent=base["BodyText"], fontName="YuGothic-Bold", fontSize=25, leading=36, textColor=colors.HexColor(INK), alignment=TA_CENTER, spaceAfter=11),
        "cover_sub": ParagraphStyle("cover_sub", parent=base["BodyText"], fontName="YuGothic", fontSize=10, leading=16, textColor=colors.HexColor(MUTED), alignment=TA_CENTER),
        "h1": ParagraphStyle("h1", parent=base["Heading1"], fontName="YuGothic-Bold", fontSize=17.5, leading=24, textColor=colors.HexColor(INK), spaceBefore=15, spaceAfter=8, keepWithNext=True),
        "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="YuGothic-Bold", fontSize=12.5, leading=18, textColor=colors.HexColor(INK), spaceBefore=10, spaceAfter=5, keepWithNext=True),
        "table_head": ParagraphStyle("table_head", parent=base["BodyText"], fontName="YuGothic-Bold", fontSize=7.6, leading=10, textColor=colors.white),
        "table_body": ParagraphStyle("table_body", parent=base["BodyText"], fontName="YuGothic", fontSize=7.7, leading=10.8, textColor=colors.HexColor(INK)),
        "table_bold": ParagraphStyle("table_bold", parent=base["BodyText"], fontName="YuGothic-Bold", fontSize=8.1, leading=11, textColor=colors.HexColor(INK)),
        "call_label": ParagraphStyle("call_label", parent=base["BodyText"], fontName="YuGothic-Bold", fontSize=8.2, leading=10, textColor=colors.white, alignment=TA_CENTER),
        "call_text": ParagraphStyle("call_text", parent=base["BodyText"], fontName="YuGothic", fontSize=8.8, leading=13, textColor=colors.HexColor(INK)),
        "bullet": ParagraphStyle("bullet", parent=base["BodyText"], fontName="YuGothic", fontSize=9.1, leading=14, textColor=colors.HexColor(INK), leftIndent=11, firstLineIndent=-7, spaceAfter=3),
    }


def P(text, style):
    return Paragraph(text.replace("\n", "<br/>"), style)


def table(headers, rows, widths, s):
    data = [[P(h, s["table_head"]) for h in headers]]
    for row in rows:
        data.append([P(str(v), s["table_body"]) for v in row])
    t = Table(data, colWidths=[w * mm for w in widths], repeatRows=1, hAlign="LEFT")
    styles = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(INK)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4.5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4.5),
        ("TOPPADDING", (0, 0), (-1, 0), 4.5),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 4.5),
        ("TOPPADDING", (0, 1), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 1), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor(LINE)),
    ]
    for idx in range(1, len(data)):
        if idx % 2 == 0:
            styles.append(("BACKGROUND", (0, idx), (-1, idx), colors.HexColor("#F7FAFC")))
    t.setStyle(TableStyle(styles))
    return t


def callout(label, text, color, s):
    t = Table([[P(label, s["call_label"]), P(text, s["call_text"])]], colWidths=[24 * mm, 146 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), colors.HexColor(color)),
        ("BACKGROUND", (1, 0), (1, 0), colors.HexColor("#F7FAFC")),
        ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor(color)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return t


def bullet(text, s):
    return P("• " + text, s["bullet"])


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(colors.HexColor(LINE))
    canvas.setLineWidth(0.4)
    canvas.line(20 * mm, 13.5 * mm, 190 * mm, 13.5 * mm)
    canvas.setFont("YuGothic", 7.2)
    canvas.setFillColor(colors.HexColor(MUTED))
    canvas.drawCentredString(105 * mm, 8.5 * mm, "LIFE NOTE  |  デザインシステムと実装ロードマップ  |  v1.0")
    canvas.drawRightString(190 * mm, 8.5 * mm, str(doc.page))
    canvas.restoreState()


def build():
    register_fonts()
    s = make_styles()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="LIFE NOTE デザインシステムと実装ロードマップ v1")
    story = []

    story += [Spacer(1, 32 * mm), P("LIFE NOTE", s["cover_brand"]), P("デザインシステムと<br/>実装ロードマップ", s["cover_title"]), P("情報を最初に見せすぎず、目的から必要な一画面へ進める生活管理アプリ", s["cover_sub"]), Spacer(1, 12 * mm)]
    cover = Table([[P("設計の順番<br/><b>基準 → 3画面 → 横展開</b>", s["table_body"]), P("対象<br/><b>ホーム / お金 / 一日の流れ</b>", s["table_body"]), P("判断軸<br/><b>少ない・迷わない・続く</b>", s["table_body"])]], colWidths=[56 * mm, 56 * mm, 56 * mm])
    cover.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F7FAFC")), ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor(LINE)),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor(LINE)), ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 12), ("BOTTOMPADDING", (0, 0), (-1, -1), 12), ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story += [cover, Spacer(1, 14 * mm), callout("決定", "以後の実装は「デザインシステムに合うか」を先に確認し、合わない既存UIは残さず置き換える。画面単位の継ぎ足し修正はしない。", INK, s), Spacer(1, 45 * mm), P("2026年8月7日  |  v1.0", s["cover_sub"]), PageBreak()]

    story += [P("1. この計画で解決すること", s["h1"]), P("現在の課題は、機能が不足していることではなく、情報・操作・装飾が同じ強さで並び、利用者が「今すること」を選びにくいことです。以後は、画面ごとの目的を一つに絞り、情報は必要になった段階で開く構造に変えます。", s["body"])]
    story += [table(["現状の問題", "置き換える原則"], [("1画面に複数の主役がある", "一画面につき、主目的と主アクションは各1つにする"), ("同じ操作が旧UI・新UIに重複する", "新しい導線を入れる時点で古い導線を削除する"), ("枠とカードが多く、読む順番が散る", "基本は余白と区切り線。面で強調するのは主役だけ"), ("文字・アイコン・色の規則がページごとに揺れる", "数値トークンと単一アイコンセットを全画面で使う"), ("アニメーションが装飾で、意味を伝えない", "状態変化・保存・展開にだけ、短く一貫した動きを使う")], [75, 95], s), Spacer(1, 7)]
    story += [P("2. 情報アーキテクチャ（入口 → 目的 → 独立画面）", s["h1"]), P("ホームは情報を読ませるページではなく、生活の入口です。数値・進捗・説明を置かず、次の三択だけを大きく見せます。", s["body"])]
    story += [table(["入口", "次の選択", "到達する独立画面", "その画面の主役"], [("記録する", "支出・収入 / こころとからだ", "支出・収入を記録 / 体調を記録", "保存する"), ("今日を整える", "一日の流れ / テーマ", "今日の時間割 / テーマ設定", "今日を確認・編集する"), ("見える化する", "お金 / こころとからだ", "お金の分析 / 体調の分析", "傾向を読む")], [24, 37, 60, 49], s), Spacer(1, 7), callout("禁止", "目的を選んだ後、別目的の情報を同じ画面に混在させない。たとえば一日の流れには支出分析や習慣の集計を常時置かない。", CORAL, s), Spacer(1, 5)]
    story += [P("3. 固定するデザインシステム", s["h1"]), P("これは見た目の好みではなく、迷わず実装・レビューするための共通言語です。例外が必要な場合は、先にこの資料を更新してから実装します。", s["body"]), P("3-1. 余白・文字・操作の基準", s["h2"])]
    story += [table(["要素", "固定ルール", "目的"], [("余白", "4px単位。主に 8 / 16 / 24 / 32px を使用", "視線のまとまりを作る"), ("文字", "12 / 14 / 16 / 20 / 28 / 36px の6段階だけ", "階層を明確にする"), ("本文", "16px未満にしない。行高は1.4〜1.6", "iPhoneで無理なく読める"), ("主ボタン", "高さ52px以上、文字16px以上", "迷わず押せる"), ("補助ボタン", "高さ44px以上、文字14px以上", "タップ領域を保証する"), ("区切り", "情報群の区切りは余白16〜24pxまたは1px罫線", "カードの過剰使用を防ぐ")], [23, 80, 67], s)]
    story += [PageBreak()]

    story += [P("3-2. 色の意味", s["h2"]), table(["用途", "色", "使う場所", "使わない場所"], [("お金（中立）", "青 #4B9FE8", "金額入力・お金の遷移", "支出と収入の区別"), ("支出・マイナス", "赤 #D95055", "支出タブ・負の金額・注意", "装飾目的の背景"), ("収入・プラス", "緑 #34B98B", "収入タブ・正の金額・達成", "常時強調した本文"), ("からだ", "緑 #34B98B", "身体評価・歩数・睡眠", "こころの評価"), ("こころ", "コーラル #F27D78", "気分・心の評価", "金銭の状態"), ("こよみ", "紫 #9577DD", "予定・時間割・カレンダー", "警告"), ("期限・注意", "黄 #F1BE48", "支払期日・未処理の注意", "主要ボタン")], [24, 27, 61, 58], s), P("3-3. アイコンと文字の細部", s["h2"]), bullet("アイコンは単一の線画SVGセットに統一する。絵文字・3Dアイコン・別テイストの記号は使用しない。", s), bullet("標準サイズは24px、座布団は48px。CSS上の中心だけでなく、実機スクリーンショットで視覚中心を確認する。", s), bullet("数字は可能な限り tabular-nums を使用し、金額は「¥4,000」、歩数は「2,619歩」のように単位まで一行で完結させる。", s), bullet("日本語本文には任意の広い字間を使わない。見出しは字間0〜0.02em、英字のLIFE NOTEだけ0.12em程度に限定する。", s)]
    story += [P("4. デザインの四原則を実装判断へ落とす", s["h1"]), table(["原則", "実装上の約束", "レビュー時の質問"], [("近接", "同じ目的の情報は16px以内に集め、目的が変わる場所は24px以上離す", "これは同じ操作のための情報か？"), ("整列", "見出し・本文・金額・アイコンの開始線を揃え、異なるグリッドを同じ画面に混在させない", "視線は左上から自然に流れるか？"), ("反復", "ボタン、セグメント、リスト行、グラフ凡例の形と挙動を全画面で再利用する", "同じ役割の部品が同じ見え方か？"), ("対比", "強い面・大きな数字・鮮やかな色は主役1つに限定する", "一目で最初に見る場所が決まるか？")], [18, 87, 65], s), Spacer(1, 7), callout("判定", "どの要素も「なぜここで目立つのか」を説明できない場合は削除または補助階層へ下げる。", VIOLET, s), Spacer(1, 5)]
    home_section = [P("5. 最初に作り直す3つの中心画面", s["h1"]), P("この3画面を先に完成させ、部品・余白・アニメーション・戻る導線を実機で検証します。残りの画面はここで確定した部品だけで作ります。", s["body"]), P("5-1. ホーム：目的を選ぶハブ", s["h2"]), table(["目的", "構成", "残すもの", "削除するもの"], [("次にすることを3秒で決める", "LIFE NOTE / 質問 / 三択", "記録する・今日を整える・見える化する", "数値、進捗、注意書き、設定の重複導線")], [36, 40, 42, 52], s), bullet("三択は縦に並べるが、巨大なカードにはしない。1行の大型リストボタンとして、アイコン・名称・矢印を同じ基準線に置く。", s), bullet("上部は「戻る」を置かない。ホームだけが起点であり、設定は右上の44pxボタンから開く。", s)]
    story += [KeepTogether(home_section)]

    story += [P("5-2. 支出・収入を記録：金額を残す画面", s["h2"]), table(["目的", "視線の順番", "主アクション", "補助"], [("支出または収入を迷わず保存する", "今日使えるお金 → 今残っているお金 → 支出/収入 → 金額 → 方法 → カテゴリー", "支出を記録 / 収入を記録", "方法・カテゴリーを追加する")], [36, 68, 31, 20], s), bullet("今日使えるお金は最上段の主役。今残っているお金は次の行で全額表示し、表示／非表示だけを切り替える。", s), bullet("支出は赤、収入は緑。タブ、保存ボタン、金額の符号に同じ意味を反復する。", s), bullet("入力は縦一列。「金額 → 方法 → カテゴリー → 保存」の順に固定し、横並び入力を使わない。", s), P("5-3. 一日の流れ：時間を読む画面", s["h2"]), table(["目的", "構成", "常時表示", "開いて表示"], [("現在時刻と今日の予定を時間順に確認・編集する", "日付とテーマ → 時間割 → 3操作", "赤い現在時刻線・時間・予定", "予定追加・チェックリスト・週/月カレンダー")], [35, 42, 41, 37], s), bullet("現在時刻は予定の上に重ねず、時間目盛りから右へ伸びる1pxの赤線と右端の時刻ラベルだけで示す。", s), bullet("予定を足す／チェックリストを開く／週・月を見るは時間割の外側に置く。時間軸の中に絶対配置しない。", s), bullet("週・月カレンダーは初期状態で閉じ、押したときだけボトムシートまたは下部展開で開く。", s)]
    story += [P("6. 部品とアニメーションの規格", s["h1"]), table(["部品", "規格", "状態"], [("ページヘッダー", "戻る / 中央タイトル / 右操作。高さ56px。開始線とタップ領域を固定", "戻るは前画面へ、ホームへは別の明示操作"), ("大型リストボタン", "高さ72px。24pxアイコン、16px名称、右矢印", "押下時: 120msで背景のみ変化"), ("主ボタン", "高さ52px。16px太字。画面内に原則1つ", "保存中→完了を短く表示"), ("セグメント", "高さ44px。選択状態は文字＋背景＋色で示す", "タップ直後に内容を切替"), ("入力行", "ラベル → 52px入力欄を縦に配置", "エラーは項目直下に表示"), ("グラフ", "見出し・期間・凡例・グラフ・補助値の順", "凡例タップで表示ON/OFF")], [30, 81, 59], s)]
    story += [PageBreak()]

    story += [P("6-1. モーション仕様", s["h2"]), table(["場面", "時間", "動き", "意図"], [("ボタン押下", "120ms", "明度と1px縮小のみ", "タップを受け取ったことを伝える"), ("画面遷移", "200ms", "右から入る/左へ戻る。ease-out", "現在地と戻る方向を伝える"), ("展開・折りたたみ", "180ms", "高さと不透明度を同時に変化", "情報がどこから現れたかを伝える"), ("保存完了", "240ms", "ボタン文言を完了に置換し短く色変更", "保存された安心感を与える"), ("数値・グラフ", "240ms", "表示時のみ上昇・描画", "変化を読む補助。自動ループ禁止")], [30, 20, 53, 67], s), bullet("すべての動きは prefers-reduced-motion を尊重し、必要時は即時表示へ切り替える。", s), bullet("常時動く装飾、意味のないバウンス、画面を待たせるローディングは禁止する。処理待ちが発生した時だけ、小さなローディング表示を使う。", s)]
    story += [P("7. 実装ロードマップと優先順位", s["h1"]), P("後から機能を足すためではなく、戻せない複雑さを増やさないための順番です。各段階の完了条件を満たすまで次へ進みません。", s["body"]), table(["優先", "作業", "成果物", "完了条件"], [("P0", "現状棚卸し・旧UI削除", "画面一覧、旧要素の削除リスト", "同じ役割の操作が1つだけ。未使用DOM/CSS/JSを削除"), ("P1", "デザイントークン・共通部品", "CSS変数、文字・余白・ボタン・アイコン規格", "3画面で同じ部品が同じ見た目と挙動"), ("P2", "ホーム再設計", "3つの大型リストボタンを持つハブ", "3秒以内に目的を選べる。余白が過剰でない"), ("P3", "支出・収入記録の再設計", "縦順入力・金額表示・方法/カテゴリー追加", "金額が省略されず、支出/収入の色が一貫"), ("P4", "一日の流れ再設計", "時間割、赤い現在時刻線、折りたたみ導線", "時間とボタンが重ならず、旧操作が残らない"), ("P5", "横展開", "体調・分析・設定・支払い予定", "P1部品のみで構成。目的外の情報を常時出さない"), ("P6", "実機QAと公開", "iPhone画面確認、デプロイ確認", "スクロール量・中心揃え・保存・戻るを全画面確認")], [12, 34, 48, 76], s), Spacer(1, 7), callout("順番", "P0〜P4が終わるまでは、分析の細かな追加機能や新しいカードを増やさない。先に骨格と反復を完成させる。", YELLOW, s)]
    story += [PageBreak(), P("8. 各画面で必ず行うレビュー", s["h1"])]
    for line in ["画面名と主目的を、1文で説明できる", "最初に見るべき要素が1つだけ決まっている", "主アクションは1つで、52px以上の高さがある", "補助操作は44px以上で、主役を邪魔していない", "アイコン、文字、矢印が同一の基準線・視覚中心に揃っている", "金額・日付・単位が途中で切れず、一行で意味を読める", "支出=赤、収入=緑、その他の意味色が混ざっていない", "旧UI、重複ボタン、説明文、未使用要素が残っていない", "戻る操作が直前の画面へ戻り、ホームへ戻る操作と混同しない", "iPhoneの実機幅でスクリーンショットを撮り、切れ・重なり・中心ずれがない"]:
        story.append(bullet("□ " + line, s))
    story += [P("9. 実装開始時の運用ルール", s["h1"]), bullet("画面を変更する前に、この資料のP0〜P6のどこに当たるかを明記する。", s), bullet("変更後はPCだけで判断せず、iPhone幅のスクリーンショットで文字・アイコン・時間軸を確認する。", s), bullet("公開前に、古いDOM、古いボタン文言、旧イベントハンドラ、未使用スタイルを検索し、残存がないことを確認する。", s), bullet("データ構造と同期方式は維持し、UIの置き換えで既存のiPhoneデータを消さない。", s), bullet("この資料にない例外が必要なら、先に理由・範囲・代替案を追記して合意を取る。", s), Spacer(1, 6), callout("次の作業", "P0として、現行UIを画面・DOM・操作単位で棚卸しし、残すもの／削除するもの／P1で置き換えるものを一覧化する。", BLUE, s)]

    doc.build(story, onFirstPage=page_number, onLaterPages=page_number)
    print(OUT)


if __name__ == "__main__":
    build()
