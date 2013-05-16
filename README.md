# express-boiler

Lihtne põhi veebiteenuste tegemiseks. Sisaldab Bootstrap põhist kujundust, kasutajate registreerimist jne.

## Featuurid

  * ExpressJS põhine **HTTPS** veebiserver
  * MongoDB baas
  * Redis põhised sessioonid
  * Kontode registreerimine
  * Konto andmete muutmine
  * Uue parooli genereerimine

## Nõuded

  * NodeJS
  * Redis
  * MongoDB

## Install

    git clone git://github.com/andris9/express-boiler.git
    cd express-boiler
    npm install
    sudo node index.js

## Konfigureerimine

Seadete failid asuvad kataloogis `config` ning õige faili valik sõltub `NODE_ENV` keskkonna väärtusest. Kui `NODE_ENV` väärtus on `"production"`, kasutatakse faili `config/production.json` Seda väärtust saab muuta ka käsurealt

    sudo NODE_ENV=production node index.js

Esialgu peaks kõik kohe töötama, probleeme võib vaid esineda e-posti välja saatmisega. Selle jaoks tuleks muuta konfiguratsioonifailis `smtp` parameetreid.

## Probleemid

Kui tekib viga `TypeError: Cannot read property 'getsockname' of undefined`, siis tuleb kontrollida, kas rakendus on ikka käivitatud `root` õigustes. Juurkasutaja õigusi on vaja juhul, kui kasutatav port on väiksem, kui 1000

## Litsents

**MIT**
