# Hage Study mobile

Mashruuca app-ka Android iyo iPhone. Dashboard-ka wuxuu ku dhex kaydsan yahay
app-ka, mana furo Chrome. Magaca iyo loogada waa Hage Study.

## Xaaladda

Source code, mashruucyada Android/iOS iyo Android APK-ga la saxiixay waa la
diyaariyey. iPhone-ka wuxuu isticmaalaa PWA ilaa Apple signing la dhammaystiro.

## Ogeysiisyada

- Native Local Notifications ayaa jadwalka telefoonka ku kaydiya.
- Akhriska wuxuu ku soo noqdaa maalinta iyo saacadda toddobaadlaha ah.
- Imtixaanka waxaa la xusuusiyaa 7, 3, 1 maalmood ka hor iyo saacaddiisa.
- Fariinta: “Waxaa la joogaa xilligii aad akhrin lahayd [maadada], hadda bilow.”
- Oggolaanshaha telefoonka iyo Android Alarms & reminders ayaa loo baahan karaa.
- Waxaa la xaddiday 60 ogeysiis oo sugaya, si loogu shaqeeyo xadka iOS;
  kuwa imtixaannada ugu dhow ayaa mudnaan leh. Fur app-ka toddobaad kasta
  si kuwa dambe loo cusboonaysiiyo. Xadkan kama dhigna 60 ogeysiis maalintii.
- Jadwalka akhriska iyo imtixaannada waa la cusboonaysiiyaa marka la kaydiyo
  ama app-ka dib loogu soo noqdo. Force stop, xannibaadaha battery-ga iyo
  oggolaanshaha la diido waxay saameyn karaan ogeysiisyada.

## Xogta

App-ku wuxuu leeyahay kayd u gaar ah. Xogta Chrome/PWA si otomaatig ah
uguma soo wareegayso, laakiin Settings-ka waxaa ku jira backup export/import
oo qaada profiles-ka iyo PDF-yada. Samee backup ka hor uninstall ama beddelka telefoonka.
Daminta ogeysiisyada PWA-ga waxay ka hortagtaa laba fariimood marka app-ka
cusub la hawlgeliyo. Qof walba xogtiisu waxay ku jirtaa telefoonkiisa.

## Dhisid

Node 22+, JDK 21+, Android SDK ku habboon mashruuca Gradle; iOS wuxuu u baahan
yahay macOS iyo Xcode 26+. Dependencies waxaa lagu qufulay package-lock.json.

    npm ci
    npm run sync
    cd android
    ./gradlew assembleDebug

Natiijada Android tijaabada: android/app/build/outputs/apk/debug/app-debug.apk.
Debug APK waa tijaabo, ma aha nooca Play Store. GitHub Actions workflow-ga
ku jira mashruucan wuxuu soo saari karaa unsigned release APK. APK-ga dadweynaha
waa in mar walba lagu saxiixaa signing key-ga joogtada ah ee milkiiluhu haysto.

iPhone: npm run ios, Xcode ka dooro kooxda Apple iyo signing-ka saxda ah,
kadib Archive. TestFlight/App Store waxay u baahan yihiin Apple Developer
membership iyo habka qaybinta Apple. APK laguma rakibo iPhone.

## Hubin ka hor qaybinta

Ku tijaabi Android iyo iPhone: profile photo, jadwal, darajooyin, back button,
ogeysiis app xiran, beddelka saacad/jadwal, restart, offline iyo permission denial.
App ID-ga ku meel gaarka ah waa app.shacirka.dashboard; xaqiiji ka hor release.
