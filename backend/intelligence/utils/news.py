"""Pure news formatting for the model gates."""


def format_news_for_prompt(news_items: list[dict]) -> str:
    """Formats news items for Gate 2/3 LLM prompts. Empty list → ''."""
    lines = []
    for item in news_items:
        line = f"{item['headline']} [Source: {item['source']}] [Reliability: {item['reliability']}]"
        if item.get('summary'):
            line += f" — {item['summary']}"
        lines.append(line)
    return '\n'.join(lines)
