"""Bible book metadata shared across Bible text sources."""

from __future__ import annotations

from typing import TypedDict


class Book(TypedDict):
    id: int
    name_ko: str
    name_en: str
    slug: str  # Midvash English slug
    bsk: str  # Korean Bible Society book code
    chapters: int
    testament: str


BOOKS: list[Book] = [
    {"id": 1, "name_ko": "창세기", "name_en": "Genesis", "slug": "genesis", "bsk": "gen", "chapters": 50, "testament": "old"},
    {"id": 2, "name_ko": "출애굽기", "name_en": "Exodus", "slug": "exodus", "bsk": "exo", "chapters": 40, "testament": "old"},
    {"id": 3, "name_ko": "레위기", "name_en": "Leviticus", "slug": "leviticus", "bsk": "lev", "chapters": 27, "testament": "old"},
    {"id": 4, "name_ko": "민수기", "name_en": "Numbers", "slug": "numbers", "bsk": "num", "chapters": 36, "testament": "old"},
    {"id": 5, "name_ko": "신명기", "name_en": "Deuteronomy", "slug": "deuteronomy", "bsk": "deu", "chapters": 34, "testament": "old"},
    {"id": 6, "name_ko": "여호수아", "name_en": "Joshua", "slug": "joshua", "bsk": "jos", "chapters": 24, "testament": "old"},
    {"id": 7, "name_ko": "사사기", "name_en": "Judges", "slug": "judges", "bsk": "jdg", "chapters": 21, "testament": "old"},
    {"id": 8, "name_ko": "룻기", "name_en": "Ruth", "slug": "ruth", "bsk": "rut", "chapters": 4, "testament": "old"},
    {"id": 9, "name_ko": "사무엘상", "name_en": "1 Samuel", "slug": "1-samuel", "bsk": "1sa", "chapters": 31, "testament": "old"},
    {"id": 10, "name_ko": "사무엘하", "name_en": "2 Samuel", "slug": "2-samuel", "bsk": "2sa", "chapters": 24, "testament": "old"},
    {"id": 11, "name_ko": "열왕기상", "name_en": "1 Kings", "slug": "1-kings", "bsk": "1ki", "chapters": 22, "testament": "old"},
    {"id": 12, "name_ko": "열왕기하", "name_en": "2 Kings", "slug": "2-kings", "bsk": "2ki", "chapters": 25, "testament": "old"},
    {"id": 13, "name_ko": "역대상", "name_en": "1 Chronicles", "slug": "1-chronicles", "bsk": "1ch", "chapters": 29, "testament": "old"},
    {"id": 14, "name_ko": "역대하", "name_en": "2 Chronicles", "slug": "2-chronicles", "bsk": "2ch", "chapters": 36, "testament": "old"},
    {"id": 15, "name_ko": "에스라", "name_en": "Ezra", "slug": "ezra", "bsk": "ezr", "chapters": 10, "testament": "old"},
    {"id": 16, "name_ko": "느헤미야", "name_en": "Nehemiah", "slug": "nehemiah", "bsk": "neh", "chapters": 13, "testament": "old"},
    {"id": 17, "name_ko": "에스더", "name_en": "Esther", "slug": "esther", "bsk": "est", "chapters": 10, "testament": "old"},
    {"id": 18, "name_ko": "욥기", "name_en": "Job", "slug": "job", "bsk": "job", "chapters": 42, "testament": "old"},
    {"id": 19, "name_ko": "시편", "name_en": "Psalms", "slug": "psalms", "bsk": "psa", "chapters": 150, "testament": "old"},
    {"id": 20, "name_ko": "잠언", "name_en": "Proverbs", "slug": "proverbs", "bsk": "pro", "chapters": 31, "testament": "old"},
    {"id": 21, "name_ko": "전도서", "name_en": "Ecclesiastes", "slug": "ecclesiastes", "bsk": "ecc", "chapters": 12, "testament": "old"},
    {"id": 22, "name_ko": "아가", "name_en": "Song of Solomon", "slug": "song-of-solomon", "bsk": "sng", "chapters": 8, "testament": "old"},
    {"id": 23, "name_ko": "이사야", "name_en": "Isaiah", "slug": "isaiah", "bsk": "isa", "chapters": 66, "testament": "old"},
    {"id": 24, "name_ko": "예레미야", "name_en": "Jeremiah", "slug": "jeremiah", "bsk": "jer", "chapters": 52, "testament": "old"},
    {"id": 25, "name_ko": "예레미야애가", "name_en": "Lamentations", "slug": "lamentations", "bsk": "lam", "chapters": 5, "testament": "old"},
    {"id": 26, "name_ko": "에스겔", "name_en": "Ezekiel", "slug": "ezekiel", "bsk": "ezk", "chapters": 48, "testament": "old"},
    {"id": 27, "name_ko": "다니엘", "name_en": "Daniel", "slug": "daniel", "bsk": "dan", "chapters": 12, "testament": "old"},
    {"id": 28, "name_ko": "호세아", "name_en": "Hosea", "slug": "hosea", "bsk": "hos", "chapters": 14, "testament": "old"},
    {"id": 29, "name_ko": "요엘", "name_en": "Joel", "slug": "joel", "bsk": "jol", "chapters": 3, "testament": "old"},
    {"id": 30, "name_ko": "아모스", "name_en": "Amos", "slug": "amos", "bsk": "amo", "chapters": 9, "testament": "old"},
    {"id": 31, "name_ko": "오바댜", "name_en": "Obadiah", "slug": "obadiah", "bsk": "oba", "chapters": 1, "testament": "old"},
    {"id": 32, "name_ko": "요나", "name_en": "Jonah", "slug": "jonah", "bsk": "jon", "chapters": 4, "testament": "old"},
    {"id": 33, "name_ko": "미가", "name_en": "Micah", "slug": "micah", "bsk": "mic", "chapters": 7, "testament": "old"},
    {"id": 34, "name_ko": "나훔", "name_en": "Nahum", "slug": "nahum", "bsk": "nam", "chapters": 3, "testament": "old"},
    {"id": 35, "name_ko": "하박국", "name_en": "Habakkuk", "slug": "habakkuk", "bsk": "hab", "chapters": 3, "testament": "old"},
    {"id": 36, "name_ko": "스바냐", "name_en": "Zephaniah", "slug": "zephaniah", "bsk": "zep", "chapters": 3, "testament": "old"},
    {"id": 37, "name_ko": "학개", "name_en": "Haggai", "slug": "haggai", "bsk": "hag", "chapters": 2, "testament": "old"},
    {"id": 38, "name_ko": "스가랴", "name_en": "Zechariah", "slug": "zechariah", "bsk": "zec", "chapters": 14, "testament": "old"},
    {"id": 39, "name_ko": "말라기", "name_en": "Malachi", "slug": "malachi", "bsk": "mal", "chapters": 4, "testament": "old"},
    {"id": 40, "name_ko": "마태복음", "name_en": "Matthew", "slug": "matthew", "bsk": "mat", "chapters": 28, "testament": "new"},
    {"id": 41, "name_ko": "마가복음", "name_en": "Mark", "slug": "mark", "bsk": "mrk", "chapters": 16, "testament": "new"},
    {"id": 42, "name_ko": "누가복음", "name_en": "Luke", "slug": "luke", "bsk": "luk", "chapters": 24, "testament": "new"},
    {"id": 43, "name_ko": "요한복음", "name_en": "John", "slug": "john", "bsk": "jhn", "chapters": 21, "testament": "new"},
    {"id": 44, "name_ko": "사도행전", "name_en": "Acts", "slug": "acts", "bsk": "act", "chapters": 28, "testament": "new"},
    {"id": 45, "name_ko": "로마서", "name_en": "Romans", "slug": "romans", "bsk": "rom", "chapters": 16, "testament": "new"},
    {"id": 46, "name_ko": "고린도전서", "name_en": "1 Corinthians", "slug": "1-corinthians", "bsk": "1co", "chapters": 16, "testament": "new"},
    {"id": 47, "name_ko": "고린도후서", "name_en": "2 Corinthians", "slug": "2-corinthians", "bsk": "2co", "chapters": 13, "testament": "new"},
    {"id": 48, "name_ko": "갈라디아서", "name_en": "Galatians", "slug": "galatians", "bsk": "gal", "chapters": 6, "testament": "new"},
    {"id": 49, "name_ko": "에베소서", "name_en": "Ephesians", "slug": "ephesians", "bsk": "eph", "chapters": 6, "testament": "new"},
    {"id": 50, "name_ko": "빌립보서", "name_en": "Philippians", "slug": "philippians", "bsk": "php", "chapters": 4, "testament": "new"},
    {"id": 51, "name_ko": "골로새서", "name_en": "Colossians", "slug": "colossians", "bsk": "col", "chapters": 4, "testament": "new"},
    {"id": 52, "name_ko": "데살로니가전서", "name_en": "1 Thessalonians", "slug": "1-thessalonians", "bsk": "1th", "chapters": 5, "testament": "new"},
    {"id": 53, "name_ko": "데살로니가후서", "name_en": "2 Thessalonians", "slug": "2-thessalonians", "bsk": "2th", "chapters": 3, "testament": "new"},
    {"id": 54, "name_ko": "디모데전서", "name_en": "1 Timothy", "slug": "1-timothy", "bsk": "1ti", "chapters": 6, "testament": "new"},
    {"id": 55, "name_ko": "디모데후서", "name_en": "2 Timothy", "slug": "2-timothy", "bsk": "2ti", "chapters": 4, "testament": "new"},
    {"id": 56, "name_ko": "디도서", "name_en": "Titus", "slug": "titus", "bsk": "tit", "chapters": 3, "testament": "new"},
    {"id": 57, "name_ko": "빌레몬서", "name_en": "Philemon", "slug": "philemon", "bsk": "phm", "chapters": 1, "testament": "new"},
    {"id": 58, "name_ko": "히브리서", "name_en": "Hebrews", "slug": "hebrews", "bsk": "heb", "chapters": 13, "testament": "new"},
    {"id": 59, "name_ko": "야고보서", "name_en": "James", "slug": "james", "bsk": "jas", "chapters": 5, "testament": "new"},
    {"id": 60, "name_ko": "베드로전서", "name_en": "1 Peter", "slug": "1-peter", "bsk": "1pe", "chapters": 5, "testament": "new"},
    {"id": 61, "name_ko": "베드로후서", "name_en": "2 Peter", "slug": "2-peter", "bsk": "2pe", "chapters": 3, "testament": "new"},
    {"id": 62, "name_ko": "요한1서", "name_en": "1 John", "slug": "1-john", "bsk": "1jn", "chapters": 5, "testament": "new"},
    {"id": 63, "name_ko": "요한2서", "name_en": "2 John", "slug": "2-john", "bsk": "2jn", "chapters": 1, "testament": "new"},
    {"id": 64, "name_ko": "요한3서", "name_en": "3 John", "slug": "3-john", "bsk": "3jn", "chapters": 1, "testament": "new"},
    {"id": 65, "name_ko": "유다서", "name_en": "Jude", "slug": "jude", "bsk": "jud", "chapters": 1, "testament": "new"},
    {"id": 66, "name_ko": "요한계시록", "name_en": "Revelation", "slug": "revelation", "bsk": "rev", "chapters": 22, "testament": "new"},
]

BOOKS_BY_SLUG = {b["slug"]: b for b in BOOKS}
BOOKS_BY_ID = {b["id"]: b for b in BOOKS}


def get_book(slug: str) -> Book | None:
    return BOOKS_BY_SLUG.get(slug)


def get_book_by_id(book_id: int) -> Book | None:
    return BOOKS_BY_ID.get(book_id)
