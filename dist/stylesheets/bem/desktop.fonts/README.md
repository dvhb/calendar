## Описание подключаемых шрифтов.

### Общие переменные 

	/* Data:URI load */

	DataUri = false

Загрузка шрифтов в Data:URI 
true / false

	/* Font Setting */

	defaultFont = 'Fedra Sans Pro Normal', sans-serif;
	fontPath = "../bem/desktop.fonts/"

defaultFont - используемый шрифт по умолчанию
fontPath - путь к шрифтам по умолчанию

### Mixin в stylus

Для быстрого переключени шрифтов используется mixin:


	 ff(medium,1,1.25)

Где

- **medium** - название шрифта
- **1** - размер шрифта в em
- **1.25** - размер межстрочного растояния в em (line-height)

### Список доступных шрифтов
1. **bold**    - Fedra Sans Pro Bold
2. **bold_i**  - Fedra Sans Pro Bold Italic
2. **book**  - Fedra Sans Pro Book
2. **book_i**  - Fedra Sans Pro Book Italic
2. **light**  - Fedra Sans Pro Light
2. **light_i**  - Fedra Sans Pro Light Italic
2. **medium**  - Fedra Sans Pro Medium
2. **medium_i**  - Fedra Sans Pro Medium Italic
2. **normal**  - Fedra Sans Pro Normal
2. **normal_i**  - Fedra Sans Pro Normal Italic


### Example
Stylus

	h1
		ff(bold,2,2.5)

CSS

	h1{
		font:700 normal 2em/2.25em 'Fedra Sans Pro Bold',sans-serif;
	}