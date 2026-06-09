# Culinary Book

Culinary Book to aplikacja webowa do wyszukiwania, przeglądania i oceniania przepisów kulinarnych. Użytkownik może założyć konto, zalogować się, dodawać przepisy do ulubionych, wystawiać oceny, pisać opinie oraz zgłaszać własne propozycje przepisów. Administrator może zarządzać propozycjami przepisów oraz usuwać opinie.

## Technologie

Projekt został wykonany z użyciem następujących technologii:

* React
* JavaScript
* HTML
* CSS
* Node.js
* Express.js
* PostgreSQL
* Docker
* Docker Compose
* TheMealDB API

## Struktura projektu

Projekt składa się z trzech głównych części: frontendu, backendu oraz bazy danych.

```txt
Aplikacja_z_przepisami_kulinarnymi/
├── Backend/
│   ├── server.js
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── .env.example
│   └── .env.docker.example
│
├── Frontend/
│   ├── public/
│   ├── src/
│   ├── package.json
│   ├── package-lock.json
│   ├── Dockerfile
│   └── .dockerignore
│
├── database/
│   └── init.sql
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Opis części projektu

### Frontend

Frontend znajduje się w folderze `Frontend`. Został przygotowany w React i odpowiada za wygląd aplikacji oraz komunikację z backendem. Zawiera widoki strony głównej, listy przepisów, szczegółów przepisu, logowania, rejestracji, profilu użytkownika oraz panelu administratora.

### Backend

Backend znajduje się w folderze `Backend`. Został przygotowany w Node.js z użyciem Express.js. Odpowiada za logikę aplikacji, obsługę zapytań API, logowanie, sesje użytkowników, komunikację z bazą danych, obsługę ocen, opinii, ulubionych przepisów oraz propozycji przepisów.

### Baza danych

Baza danych działa w PostgreSQL. Struktura bazy oraz dane startowe znajdują się w pliku `database/init.sql`. Baza przechowuje użytkowników, przepisy, ulubione przepisy, oceny, opinie, propozycje przepisów oraz sesje użytkowników.

## Wymagania do uruchomienia

Do uruchomienia projektu wymagane są:

* Docker Desktop
* Git
* przeglądarka internetowa

Node.js nie jest wymagany do uruchomienia aplikacji przez Dockera, ponieważ zależności instalują się wewnątrz kontenerów.

## Konfiguracja plików środowiskowych

Pliki `.env` oraz `.env.docker` nie są dodawane do repozytorium, ponieważ mogą zawierać hasła, klucze API oraz dane dostępowe.

Po pobraniu projektu należy utworzyć pliki środowiskowe w folderze `Backend`.

Należy skopiować:

```txt
Backend/.env.example
```

jako:

```txt
Backend/.env
```

oraz:

```txt
Backend/.env.docker.example
```

jako:

```txt
Backend/.env.docker
```

W pliku `Backend/.env.docker` należy ustawić dane potrzebne do uruchomienia aplikacji w Dockerze.

Przykład:

```env
PORT=5000

DB_USER=postgres
DB_HOST=db
DB_NAME=culinary_book
DB_PASSWORD=1234
DB_PORT=5432

MEALDB_API_KEY=your_api_key
SESSION_SECRET=your_session_secret

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

W Dockerze zmienna `DB_HOST` musi mieć wartość:

```env
DB_HOST=db
```

Nie należy wpisywać `localhost`, ponieważ backend działa w osobnym kontenerze i łączy się z bazą danych przez nazwę usługi `db`.

## Uruchomienie projektu

Projekt należy uruchamiać z głównego folderu, czyli z miejsca, w którym znajduje się plik `docker-compose.yml`.

Komenda uruchamiająca projekt:

```bash
docker compose up --build
```

Po uruchomieniu Docker zbuduje i uruchomi trzy usługi:

* frontend
* backend
* bazę danych PostgreSQL

Baza danych zostanie utworzona automatycznie na podstawie pliku:

```txt
database/init.sql
```

## Adresy aplikacji

Po uruchomieniu projektu aplikacja będzie dostępna pod adresami:

Frontend:

```txt
http://localhost:3000
```

Backend:

```txt
http://localhost:5000
```

Po wejściu na adres backendu powinien pojawić się komunikat:

```json
{
  "message": "API działa"
}
```

## Zatrzymanie projektu

Aby zatrzymać działające kontenery, należy użyć:

```bash
docker compose down
```

Ta komenda zatrzymuje kontenery, ale nie usuwa danych zapisanych w bazie danych.

## Reset bazy danych

Jeżeli baza danych ma zostać utworzona od nowa i ponownie zaimportowana z pliku `init.sql`, należy użyć:

```bash
docker compose down -v
docker compose up --build
```

Uwaga: komenda `docker compose down -v` usuwa dane zapisane w dockerowej bazie danych.

