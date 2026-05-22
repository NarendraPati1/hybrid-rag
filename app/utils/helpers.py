import re

STOPWORDS = {
    "a","an","the","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","could",
    "should","may","might","shall","can","need","dare","ought",
    "used","to","of","in","for","on","with","at","by","from",
    "as","into","through","during","before","after","above",
    "below","up","down","out","off","over","under","again",
    "further","then","once","and","or","but","if","while",
    "this","that","these","those","it","its","tool","tools",
    "ai","platform","app","software","using","use","uses","build",
    "built","based","powered","via","also","well","like","make"
}

def clean_tokens(text: str) -> list[str]:
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s\-]", " ", text)
    tokens = text.split()
    tokens = [t.strip("-") for t in tokens if len(t) > 1]
    tokens = [t for t in tokens if t not in STOPWORDS]
    return tokens
