import { EXTRA_DICTIONARIES, EXTRA_META } from './i18n-extra.js?v=20261115-nine-languages';

const STORAGE_KEY = 'recipe-story:language:v1';
const SUPPORTED = ['en', 'ko', 'ja', 'fr', 'it', 'hi', 'es-MX', 'zh-CN', 'ar'];

const ko = {
  'Skip to recipes': '레시피로 바로가기', 'Discover': '둘러보기', 'Watch & cook': '영상으로 요리하기', 'My recipe book': '나의 레시피',
  'Share a recipe': '레시피 올리기', 'Your name': '내 이름', 'YOUR DAILY INSPIRATION': '오늘의 맛있는 영감', 'Video recipes': '영상 레시피',
  'Photo recipes': '사진 레시피', 'WHAT ARE YOU CRAVING?': '오늘은 어떤 음식이 당기나요?', 'A little homemade.': '집에서 만든 한 끼,',
  'A lot to love.': '더 많이 사랑하게 돼요.', 'Your kitchen has a story.': '당신의 주방에는 이야기가 있어요.', "We'd love a taste.": '그 맛을 함께 나눠주세요.',
  'Share yours': '내 레시피 올리기', 'Made for the joy of cooking.': '요리하는 즐거움을 위해 만들었어요.', 'A PLACE AT THE TABLE': '모두를 위한 식탁',
  'Good food.': '맛있는 음식.', 'Worth sharing.': '함께 나눌 가치가 있어요.', 'Your next favorite meal starts here.': '다음 최애 메뉴는 여기서 시작돼요.',
  'Find it, save it, make it your own.': '찾고, 저장하고, 나만의 요리로 만들어보세요.', 'Find your next meal': '다음 메뉴 찾기',
  'Real recipes. Your kind of cooking.': '진짜 레시피, 나다운 요리.', 'Big flavor. Little time.': '시간은 짧게, 맛은 진하게.',
  'Find your under-30-minute fix': '30분 안에 완성하는 한 끼', 'A bowl of comfort': '마음을 채우는 한 그릇', 'Pasta, noodles & happy places': '파스타와 면 요리로 행복하게',
  'Save room for sweet': '디저트 배는 따로', 'A little treat goes a long way': '작은 달콤함이 만드는 큰 행복', 'FROM ONE KITCHEN TO ANOTHER': '한 주방에서 또 다른 주방으로',
  'A fresh page of inspiration': '새로운 맛의 영감', 'Every recipe has a story. Find one you want to bring home.': '모든 레시피에는 이야기가 있어요. 우리 집으로 가져갈 이야기를 찾아보세요.',
  'Surprise me': '랜덤 추천', 'All recipes': '전체', 'Videos': '영상', 'Photos': '사진', 'Saved': '저장됨', 'Filters': '필터',
  'Category': '카테고리', 'All categories': '모든 카테고리', 'World cuisines': '세계 요리', 'Everyday cooking': '일상 요리', 'Treats & more': '디저트와 기타',
  'Cooking time': '조리 시간', 'Any time': '시간 무관', '15 minutes or less': '15분 이하', '30 minutes or less': '30분 이하', '60 minutes or less': '60분 이하',
  'Difficulty': '난이도', 'Any level': '난이도 무관', 'Sort by': '정렬', 'Newest first': '최신순', 'Quickest to cook': '조리 시간 짧은 순', 'Reset filters': '필터 초기화',
  'Opening the recipe book…': '레시피 이야기를 여는 중…', 'EVERY GREAT BOOK STARTS SOMEWHERE': '모든 멋진 이야기는 한 페이지에서 시작돼요', 'The first page is yours.': '첫 이야기는 당신의 차례예요.',
  'That dish everyone asks you to make? Start with that.': '모두가 다시 만들어 달라고 하는 그 요리, 그걸로 시작해보세요.', 'Share a recipe and give someone a new favorite.': '레시피를 나누고 누군가의 새로운 최애를 만들어주세요.',
  'Clear filters': '필터 지우기', 'Try again': '다시 시도', 'No sign-up. Just your name and something delicious.': '회원가입 없이 이름과 맛있는 레시피만 있으면 돼요.',
  'Your own little cookbook': '나만의 작은 요리책', 'Save favorites on this device.': '좋아하는 레시피를 이 기기에 저장하세요.', 'See it. Cook it.': '보고 바로 요리해요.',
  'Photos, videos & clear steps.': '사진, 영상, 쉬운 조리 순서.', 'Less fuss. More flavor.': '수고는 줄이고, 맛은 더하고.', 'Simple recipes, simply shared.': '간단한 레시피를 간편하게 나눠요.',
  'Good food brings us together.': '맛있는 음식은 우리를 이어줘요.', 'Your creator name': '내 크리에이터 이름', 'My book': '내 레시피', 'You': '나',
  'FROM YOUR KITCHEN': '당신의 주방에서', 'Share a little delicious.': '맛있는 이야기를 나눠보세요.', 'The basics': '기본 정보', 'The recipe': '레시피', 'The look': '사진·영상',
  'What are we making?': '어떤 요리인가요?', 'The name people will know you by': '다른 사람에게 표시될 이름', 'Already picked a name? It stays with this browser.': '한번 정한 이름은 이 브라우저에 저장돼요.',
  'A little about your recipe': '레시피를 소개해주세요', 'optional': '선택', 'Total time (minutes)': '총 조리 시간(분)', 'Servings': '인분',
  'Ingredients and method': '재료와 조리법', 'What goes in': '필요한 재료', 'List each ingredient and how much to use.': '재료와 분량을 하나씩 적어주세요.', 'Add': '추가',
  'How it comes together': '만드는 방법', 'One simple step at a time.': '쉬운 순서대로 하나씩 알려주세요.', 'Photo or video': '사진 또는 영상', 'Let your cooking do the talking.': '요리를 가장 멋지게 보여주세요.',
  'Add a photo or a video, or keep it beautifully simple.': '사진이나 영상을 추가하거나 레시피만 깔끔하게 올릴 수 있어요.', 'Photo': '사진', 'Video': '영상', 'Recipe only': '레시피만',
  'Choose a photo': '사진 선택', 'Choose a video': '영상 선택', 'Remove attachment': '첨부 삭제', 'Photo framing': '사진 맞춤', 'Fill the card (edges may be cropped)': '카드에 꽉 채우기(가장자리가 잘릴 수 있음)',
  'Show the whole photo': '사진 전체 보기', 'Your recipe will be public. Share media you have permission to use.': '레시피는 공개돼요. 사용 권한이 있는 사진과 영상만 올려주세요.',
  'Uploading': '업로드 중', 'Getting your recipe ready.': '레시피를 준비하고 있어요.', 'Back': '이전', 'Start over': '처음부터', 'Continue': '계속', 'Publish recipe': '레시피 공개',
  'PASS THE GOOD STUFF ON': '맛있는 이야기를 전해보세요', 'Share this recipe.': '이 레시피 공유하기', 'Send the direct link to anyone. They can open the same recipe without signing up.': '링크를 보내면 누구나 회원가입 없이 같은 레시피를 볼 수 있어요.',
  'Recipe link': '레시피 링크', 'Copy link': '링크 복사', 'Share with apps': '앱으로 공유', 'MAKE IT YOURS': '나만의 이름 만들기', 'A name for your kitchen.': '주방을 대표할 이름을 정하세요.',
  "Choose a name that's all yours": '나만 사용할 이름을 정해주세요', 'Save my name': '이름 저장',
  "Your name appears on your recipes. Your creator identity stays in this browser; clearing site data or switching devices won't carry it over. Renaming also updates your earlier recipes.": '이름은 내가 올린 레시피에 표시돼요. 크리에이터 정보는 이 브라우저에만 저장되며, 사이트 데이터를 지우거나 기기를 바꾸면 이어지지 않아요. 이름을 바꾸면 이전 레시피에도 반영돼요.',
  'Please enable JavaScript to explore and share recipes.': '레시피를 보고 공유하려면 JavaScript를 켜주세요.', 'Main navigation': '주요 메뉴', 'Recipe navigation': '레시피 메뉴', 'Browse recipes': '레시피 둘러보기',
  'Recipe categories': '레시피 카테고리', 'Quick ways to explore': '빠른 탐색', 'Recipe format': '레시피 형식', 'Search recipes or ingredients': '레시피 또는 재료 검색',
  'A dish, an ingredient, a craving…': '요리, 재료, 먹고 싶은 메뉴…', 'Mobile navigation': '모바일 메뉴', 'Recipe creation progress': '레시피 작성 단계', 'Choose recipe media': '사진 또는 영상 선택',
  'Close': '닫기', 'Close recipe': '레시피 닫기', 'Korean': '한식', 'Japanese': '일식', 'Chinese': '중식', 'Mexican': '멕시칸', 'American': '아메리칸', 'French': '프렌치',
  'Italian': '이탈리안', 'Indian': '인도식', 'Brunch': '브런치', 'Lunchbox': '도시락', 'Quick & easy': '간편식', 'Quick & Easy': '간편식', 'Noodles & pasta': '면·파스타', 'Noodles & Pasta': '면·파스타',
  'Vegetarian': '채식', 'Desserts': '디저트', 'Drinks': '음료', 'Other': '기타', 'Easy': '쉬움', 'Medium': '보통', 'Advanced': '어려움',
  'e.g. Sunday tomato & basil pasta': '예: 일요일의 토마토 바질 파스타', 'A family favorite, a weeknight lifesaver, a happy accident…': '가족의 최애 메뉴, 바쁜 평일의 간단한 한 끼, 우연히 탄생한 레시피…',
  'e.g. 200 g': '예: 200g', 'Ingredient': '재료', 'Describe one simple step…': '한 단계씩 쉽게 설명해주세요…',
  'Find your next favorite.': '다음 최애 레시피를 찾아보세요.', 'Watch. Cook. Repeat.': '보고, 요리하고, 또 즐겨요.', 'A little visual inspiration.': '맛있는 사진에서 영감을 받아보세요.', 'Your recipe collection.': '나만의 레시피 모음.',
  'Good food starts with a good idea.': '맛있는 음식은 좋은 아이디어에서 시작돼요.', 'Real cooking, one short video at a time.': '짧은 영상으로 만나는 진짜 요리.', 'Discover dishes worth making your own.': '직접 만들어보고 싶은 요리를 찾아보세요.',
  'Your favorites, saved on this device. Ready when you are.': '이 기기에 저장한 나의 최애 레시피. 언제든 바로 볼 수 있어요.', 'Home cook': '홈쿡 크리에이터', 'Made to be shared.': '함께 나누는 레시피.',
  'Recipe': '레시피', 'Save': '저장', 'Unsave': '저장 해제', 'Saved': '저장됨', 'Save recipe': '레시피 저장', 'Share': '공유', 'Start cooking': '요리 시작', 'Exit cooking mode': '요리 모드 종료',
  'Ingredients': '재료', 'Check them off as you go.': '준비한 재료를 하나씩 체크하세요.', 'No ingredients were added.': '등록된 재료가 없어요.', 'Let’s make it.': '이제 만들어볼까요?', 'No steps were added.': '등록된 조리 순서가 없어요.',
  'Delete my recipe': '내 레시피 삭제', 'Your browser cannot play this video.': '이 브라우저에서는 영상을 재생할 수 없어요.',
  'Finding something delicious…': '맛있는 레시피를 찾는 중…', 'The recipe feed is temporarily unavailable.': '지금은 레시피 목록을 불러올 수 없어요.', 'Your next favorite is worth the wait.': '다음 최애 레시피를 조금만 기다려주세요.',
  'We could not connect to the recipe collection. Please try again.': '레시피 목록에 연결하지 못했어요. 다시 시도해주세요.', 'Nothing here just yet.': '아직 여기에 레시피가 없어요.',
  'Start your personal recipe book.': '나만의 레시피북을 시작해보세요.', 'The first video is yours to share.': '첫 영상 레시피를 올려보세요.', 'A delicious photo belongs here.': '맛있는 사진을 기다리고 있어요.',
  'Every recipe book starts somewhere.': '모든 레시피 이야기는 한 접시에서 시작돼요.', 'Try another ingredient or clear your filters to explore more.': '다른 재료로 검색하거나 필터를 지워보세요.',
  'Tap the bookmark on a recipe to keep it here on this device.': '레시피의 북마크를 누르면 이 기기에 저장돼요.', 'Share something you love to cook. A simple recipe can make someone’s day.': '좋아하는 요리를 나눠보세요. 간단한 레시피 하나가 누군가의 하루를 특별하게 만들어요.',
  'A recipe from a real home kitchen. Make it yours.': '진짜 집밥 주방에서 온 레시피예요. 나만의 방식으로 만들어보세요.', 'Link copied. Ready to share.': '링크를 복사했어요. 바로 공유해보세요.',
  'Your recipe has been deleted.': '레시피를 삭제했어요.', 'Your creator name has been updated.': '크리에이터 이름을 바꿨어요.', 'Your recipe is live. Thanks for sharing your kitchen.': '레시피가 공개됐어요. 맛있는 이야기를 나눠줘서 고마워요.',
  'Preparing your recipe…': '레시피 준비 중…', 'Check publication status': '공개 상태 확인', 'Saving your recipe…': '레시피 저장 중…', 'Checking publication…': '공개 상태 확인 중…',
  'Ingredient amount': '재료 분량', 'Ingredient name': '재료 이름', 'Remove ingredient': '재료 삭제', 'Cooking instruction': '조리 방법', 'Remove step': '단계 삭제',
  'Your selected recipe photo': '선택한 레시피 사진', 'Your kitchen': '나의 주방', 'Choose your creator name': '크리에이터 이름 정하기'
};

const ja = {
  'Skip to recipes':'レシピへ移動','Discover':'見つける','Watch & cook':'動画で作る','My recipe book':'マイレシピ','Share a recipe':'レシピを投稿','Your name':'名前',
  'YOUR DAILY INSPIRATION':'今日のインスピレーション','Video recipes':'動画レシピ','Photo recipes':'写真レシピ','WHAT ARE YOU CRAVING?':'今日は何が食べたい？',
  'A little homemade.':'手作りのひと皿。','A lot to love.':'もっと好きになる。','Your kitchen has a story.':'あなたのキッチンには物語があります。',"We'd love a taste.":'その味をシェアしてください。','Share yours':'投稿する','Made for the joy of cooking.':'料理の楽しさのために。',
  'A PLACE AT THE TABLE':'みんなの食卓','Good food.':'おいしい料理。','Worth sharing.':'分かち合う価値がある。','Your next favorite meal starts here.':'次のお気に入りはここから始まります。','Find it, save it, make it your own.':'見つけて、保存して、自分らしく作ろう。','Find your next meal':'次の料理を見つける','Real recipes. Your kind of cooking.':'本物のレシピ。自分らしい料理。',
  'Big flavor. Little time.':'短時間で、しっかりおいしい。','Find your under-30-minute fix':'30分以内のレシピ','A bowl of comfort':'ほっとするひと皿','Pasta, noodles & happy places':'パスタと麺で幸せな時間','Save room for sweet':'デザートは別腹','A little treat goes a long way':'小さなご褒美、大きな幸せ',
  'FROM ONE KITCHEN TO ANOTHER':'キッチンからキッチンへ','A fresh page of inspiration':'新しいおいしさのヒント','Every recipe has a story. Find one you want to bring home.':'すべてのレシピには物語があります。家に持ち帰りたい物語を見つけよう。','Surprise me':'おまかせ','All recipes':'すべて','Videos':'動画','Photos':'写真','Saved':'保存済み','Filters':'絞り込み',
  'Category':'カテゴリー','All categories':'すべてのカテゴリー','World cuisines':'世界の料理','Everyday cooking':'毎日の料理','Treats & more':'スイーツ・その他','Cooking time':'調理時間','Any time':'指定なし','15 minutes or less':'15分以内','30 minutes or less':'30分以内','60 minutes or less':'60分以内','Difficulty':'難易度','Any level':'指定なし','Sort by':'並び順','Newest first':'新着順','Quickest to cook':'調理時間が短い順','Reset filters':'リセット',
  'Opening the recipe book…':'レシピストーリーを開いています…','EVERY GREAT BOOK STARTS SOMEWHERE':'すべての物語は最初の1ページから','The first page is yours.':'最初の物語はあなたから。','That dish everyone asks you to make? Start with that.':'みんなにまた作ってと言われる料理から始めよう。','Share a recipe and give someone a new favorite.':'レシピを投稿して、誰かの新しいお気に入りを作ろう。','Clear filters':'絞り込みを解除','Try again':'もう一度','No sign-up. Just your name and something delicious.':'登録不要。名前とおいしいレシピだけで始められます。',
  'Your own little cookbook':'自分だけのレシピブック','Save favorites on this device.':'お気に入りをこの端末に保存。','See it. Cook it.':'見て、すぐ作れる。','Photos, videos & clear steps.':'写真、動画、わかりやすい手順。','Less fuss. More flavor.':'手間を減らして、おいしさをもっと。','Simple recipes, simply shared.':'シンプルなレシピを気軽にシェア。','Good food brings us together.':'おいしい料理が人をつなぐ。','Your creator name':'クリエイター名','My book':'マイレシピ','You':'あなた',
  'FROM YOUR KITCHEN':'あなたのキッチンから','Share a little delicious.':'おいしい物語をシェアしよう。','The basics':'基本情報','The recipe':'レシピ','The look':'写真・動画','What are we making?':'何を作りますか？','The name people will know you by':'みんなに表示される名前','Already picked a name? It stays with this browser.':'選んだ名前はこのブラウザに保存されます。','A little about your recipe':'レシピの紹介','optional':'任意','Total time (minutes)':'合計時間（分）','Servings':'人数分',
  'Ingredients and method':'材料と作り方','What goes in':'材料','List each ingredient and how much to use.':'材料と分量を1つずつ入力してください。','Add':'追加','How it comes together':'作り方','One simple step at a time.':'簡単な手順を順番に入力してください。','Photo or video':'写真または動画','Let your cooking do the talking.':'料理をいちばん魅力的に見せよう。','Add a photo or a video, or keep it beautifully simple.':'写真や動画を追加、またはレシピだけでも投稿できます。','Photo':'写真','Video':'動画','Recipe only':'レシピのみ','Choose a photo':'写真を選ぶ','Choose a video':'動画を選ぶ','Remove attachment':'添付を削除','Photo framing':'写真の表示','Fill the card (edges may be cropped)':'カードいっぱいに表示（端が切れる場合があります）','Show the whole photo':'写真全体を表示','Your recipe will be public. Share media you have permission to use.':'レシピは公開されます。使用許可のある写真・動画を投稿してください。','Uploading':'アップロード中','Getting your recipe ready.':'レシピを準備しています。','Back':'戻る','Start over':'最初から','Continue':'次へ','Publish recipe':'レシピを公開',
  'PASS THE GOOD STUFF ON':'おいしさを届けよう','Share this recipe.':'このレシピをシェア','Send the direct link to anyone. They can open the same recipe without signing up.':'リンクを送れば、登録なしで同じレシピを見られます。','Recipe link':'レシピリンク','Copy link':'リンクをコピー','Share with apps':'アプリでシェア','MAKE IT YOURS':'自分らしい名前を','A name for your kitchen.':'キッチンを表す名前を決めよう。',"Choose a name that's all yours":'自分だけの名前を選んでください','Save my name':'名前を保存',
  "Your name appears on your recipes. Your creator identity stays in this browser; clearing site data or switching devices won't carry it over. Renaming also updates your earlier recipes.":'名前は投稿したレシピに表示されます。クリエイター情報はこのブラウザにのみ保存され、サイトデータの削除や端末変更では引き継がれません。名前の変更は以前のレシピにも反映されます。',
  'Please enable JavaScript to explore and share recipes.':'レシピを見る・投稿するにはJavaScriptを有効にしてください。','Main navigation':'メインメニュー','Recipe navigation':'レシピメニュー','Browse recipes':'レシピを見る','Recipe categories':'レシピカテゴリー','Quick ways to explore':'クイック検索','Recipe format':'レシピ形式','Search recipes or ingredients':'レシピや材料を検索','A dish, an ingredient, a craving…':'料理、材料、食べたいもの…','Mobile navigation':'モバイルメニュー','Recipe creation progress':'レシピ作成ステップ','Choose recipe media':'写真または動画を選択','Close':'閉じる','Close recipe':'レシピを閉じる',
  'Korean':'韓国料理','Japanese':'日本料理','Chinese':'中華料理','Mexican':'メキシコ料理','American':'アメリカ料理','French':'フランス料理','Italian':'イタリア料理','Indian':'インド料理','Brunch':'ブランチ','Lunchbox':'お弁当','Quick & easy':'簡単料理','Quick & Easy':'簡単料理','Noodles & pasta':'麺・パスタ','Noodles & Pasta':'麺・パスタ','Vegetarian':'ベジタリアン','Desserts':'デザート','Drinks':'ドリンク','Other':'その他','Easy':'かんたん','Medium':'ふつう','Advanced':'上級',
  'e.g. Sunday tomato & basil pasta':'例：日曜日のトマトバジルパスタ','A family favorite, a weeknight lifesaver, a happy accident…':'家族のお気に入り、平日の時短料理、偶然できた一品…','e.g. 200 g':'例：200g','Ingredient':'材料','Describe one simple step…':'手順をわかりやすく説明…',
  'Find your next favorite.':'次のお気に入りを見つけよう。','Watch. Cook. Repeat.':'見て、作って、また楽しむ。','A little visual inspiration.':'おいしい写真からヒントを。','Your recipe collection.':'あなたのレシピコレクション。','Good food starts with a good idea.':'おいしい料理は素敵なアイデアから。','Real cooking, one short video at a time.':'短い動画で見る、本当の料理。','Discover dishes worth making your own.':'自分で作りたい料理を見つけよう。','Your favorites, saved on this device. Ready when you are.':'この端末に保存したお気に入り。いつでも見られます。','Home cook':'ホームクック','Made to be shared.':'シェアしたくなるレシピ。','Recipe':'レシピ','Save':'保存','Unsave':'保存解除','Save recipe':'レシピを保存','Share':'シェア','Start cooking':'クッキング開始','Exit cooking mode':'クッキングモード終了','Ingredients':'材料','Check them off as you go.':'準備した材料をチェックしよう。','No ingredients were added.':'材料が登録されていません。','Let’s make it.':'作ってみよう。','No steps were added.':'手順が登録されていません。','Delete my recipe':'レシピを削除','Your browser cannot play this video.':'このブラウザでは動画を再生できません。',
  'Finding something delicious…':'おいしいレシピを探しています…','The recipe feed is temporarily unavailable.':'現在レシピ一覧を読み込めません。','Your next favorite is worth the wait.':'次のお気に入りをもう少しお待ちください。','We could not connect to the recipe collection. Please try again.':'レシピ一覧に接続できませんでした。もう一度お試しください。','Nothing here just yet.':'まだレシピがありません。','Start your personal recipe book.':'自分だけのレシピブックを始めよう。','The first video is yours to share.':'最初の動画レシピを投稿しよう。','A delicious photo belongs here.':'おいしい写真を待っています。','Every recipe book starts somewhere.':'すべてのレシピ物語はひと皿から。','Try another ingredient or clear your filters to explore more.':'別の材料で検索するか、絞り込みを解除してください。','Tap the bookmark on a recipe to keep it here on this device.':'ブックマークを押すと、この端末に保存されます。','Share something you love to cook. A simple recipe can make someone’s day.':'好きな料理をシェアしよう。ひとつのレシピが誰かの一日を特別にします。','A recipe from a real home kitchen. Make it yours.':'本当の家庭のキッチンから届いたレシピ。自分らしく作ろう。','Link copied. Ready to share.':'リンクをコピーしました。','Your recipe has been deleted.':'レシピを削除しました。','Your creator name has been updated.':'クリエイター名を変更しました。','Your recipe is live. Thanks for sharing your kitchen.':'レシピを公開しました。シェアしてくれてありがとう。','Preparing your recipe…':'レシピを準備中…','Check publication status':'公開状態を確認','Saving your recipe…':'レシピを保存中…','Checking publication…':'公開状態を確認中…','Ingredient amount':'材料の分量','Ingredient name':'材料名','Remove ingredient':'材料を削除','Cooking instruction':'作り方','Remove step':'手順を削除','Your selected recipe photo':'選択したレシピ写真','Your kitchen':'マイキッチン','Choose your creator name':'クリエイター名を選ぶ'
};

Object.assign(ko, {
  'Language':'언어','Open':'열기','Change creator name':'크리에이터 이름 바꾸기',
  'That name is already taken. Please choose a different name.':'이미 사용 중인 이름이에요. 다른 이름을 선택해주세요.',
  'Please check the recipe fields and their limits, then try again.':'레시피 입력 내용과 글자 수를 확인한 뒤 다시 시도해주세요.',
  'This browser does not have permission to make that change.':'이 브라우저에서는 해당 내용을 변경할 권한이 없어요.',
  'Connection lost. Check your internet connection and try again.':'연결이 끊겼어요. 인터넷 연결을 확인하고 다시 시도해주세요.',
  'Something went wrong. Please try again.':'문제가 생겼어요. 다시 시도해주세요.','Recipe sharing is temporarily unavailable. Please try again later.':'지금은 레시피를 올릴 수 없어요. 잠시 후 다시 시도해주세요.',
  'We could not prepare your guest profile. Please try again in a moment.':'크리에이터 정보를 준비하지 못했어요. 잠시 후 다시 시도해주세요.','Recipe connection is unavailable.':'레시피 서비스에 연결할 수 없어요.',
  'Your name must be between 2 and 40 characters.':'이름은 2자 이상 40자 이하로 입력해주세요.','Only the creator can delete this recipe.':'이 레시피를 올린 사람만 삭제할 수 있어요.',
  'Saved to your recipe book on this device.':'이 기기의 내 레시피에 저장했어요.','Removed from your saved recipes.':'저장한 레시피에서 삭제했어요.','Saved for this visit. This browser is blocking storage.':'이번 방문 동안만 저장했어요. 브라우저에서 저장 기능을 차단하고 있어요.',
  'The link is selected. Press Ctrl+C or choose Copy from your device.':'링크를 선택했어요. Ctrl+C를 누르거나 기기의 복사 메뉴를 이용해주세요.','We could not delete this recipe.':'레시피를 삭제하지 못했어요.',
  'Choose a creator name between 2 and 40 characters.':'크리에이터 이름을 2자 이상 40자 이하로 정해주세요.','Give your recipe a title between 2 and 80 characters.':'레시피 제목은 2자 이상 80자 이하로 입력해주세요.',
  'Keep your description to 600 characters or fewer.':'레시피 소개는 600자 이하로 입력해주세요.','Cooking time must be a whole number from 1 to 600 minutes.':'조리 시간은 1분에서 600분 사이의 정수로 입력해주세요.',
  'Servings must be a whole number from 1 to 50.':'인분은 1에서 50 사이의 정수로 입력해주세요.','Choose a category and difficulty.':'카테고리와 난이도를 선택해주세요.','Add at least one ingredient.':'재료를 하나 이상 추가해주세요.',
  'Each ingredient needs a name (up to 120 characters) and an optional amount (up to 60).':'재료 이름은 필수이며 120자 이하, 분량은 선택이며 60자 이하로 입력해주세요.','Add at least one cooking step. Each step needs 2–500 characters.':'조리 단계를 하나 이상 추가하고 각 단계는 2~500자로 입력해주세요.',
  'Choose how your photo should fit the card.':'사진을 카드에 어떻게 표시할지 선택해주세요.',' Your previous attachment is still selected.':' 이전에 선택한 첨부 파일은 그대로 유지돼요.','Choose an MP4, WebM or MOV video under 100 MB.':'100MB 이하의 MP4, WebM 또는 MOV 영상을 선택해주세요.',
  'Choose a JPG, PNG or WebP photo under 10 MB.':'10MB 이하의 JPG, PNG 또는 WebP 사진을 선택해주세요.','Your upload session expired. Please try again.':'업로드 연결이 만료됐어요. 다시 시도해주세요.','The upload service has not loaded. Refresh this page and try again.':'업로드 서비스를 불러오지 못했어요. 페이지를 새로고침하고 다시 시도해주세요.',
  'Finishing your upload…':'업로드 마무리 중…','Publication did not finish. Your draft is still here. Click Publish recipe to try again.':'공개를 완료하지 못했어요. 작성한 내용은 남아 있으니 레시피 공개를 다시 눌러주세요.',
  'We could not confirm publication. Your recipe may already be live. Check its status before trying again; your draft and uploaded files have been kept.':'공개 상태를 확인하지 못했어요. 이미 공개됐을 수 있으니 상태를 먼저 확인해주세요. 작성 내용과 파일은 그대로 보관했어요.',
  'We could not publish your recipe. Your draft is still here.':'레시피를 공개하지 못했어요. 작성한 내용은 그대로 남아 있어요.','Your recipe is published. Refresh the feed to see it.':'레시피가 공개됐어요. 목록을 새로고침하면 볼 수 있어요.',
  'Check the publication status before starting over.':'처음부터 다시 시작하기 전에 공개 상태를 확인해주세요.','Discard this unfinished recipe and start again?':'작성 중인 레시피를 지우고 처음부터 다시 시작할까요?','Your unfinished recipe has been cleared.':'작성 중인 레시피를 지웠어요.',
  'Your device could not open its share menu. Copy the link instead.':'공유 메뉴를 열지 못했어요. 링크를 복사해주세요.','Add a recipe or clear your filters to find some inspiration.':'레시피를 추가하거나 필터를 지우고 새로운 메뉴를 찾아보세요.',
  'Your name could not be saved.':'이름을 저장하지 못했어요.','That recipe is no longer available. Explore something new.':'이 레시피는 더 이상 볼 수 없어요. 다른 레시피를 둘러보세요.'
});

Object.assign(ja, {
  'Language':'言語','Open':'開く','Change creator name':'クリエイター名を変更',
  'That name is already taken. Please choose a different name.':'その名前はすでに使われています。別の名前を選んでください。','Please check the recipe fields and their limits, then try again.':'入力内容と文字数を確認して、もう一度お試しください。','This browser does not have permission to make that change.':'このブラウザには変更する権限がありません。','Connection lost. Check your internet connection and try again.':'接続が切れました。インターネット接続を確認してください。','Something went wrong. Please try again.':'問題が発生しました。もう一度お試しください。',
  'Recipe sharing is temporarily unavailable. Please try again later.':'現在レシピを投稿できません。しばらくしてからお試しください。','We could not prepare your guest profile. Please try again in a moment.':'クリエイター情報を準備できませんでした。しばらくしてからお試しください。','Recipe connection is unavailable.':'レシピサービスに接続できません。','Your name must be between 2 and 40 characters.':'名前は2〜40文字で入力してください。','Only the creator can delete this recipe.':'このレシピを投稿した人だけが削除できます。',
  'Saved to your recipe book on this device.':'この端末のマイレシピに保存しました。','Removed from your saved recipes.':'保存済みレシピから削除しました。','Saved for this visit. This browser is blocking storage.':'今回の閲覧中のみ保存しました。ブラウザが保存をブロックしています。','The link is selected. Press Ctrl+C or choose Copy from your device.':'リンクを選択しました。Ctrl+Cまたは端末のコピー機能を使ってください。','We could not delete this recipe.':'レシピを削除できませんでした。',
  'Choose a creator name between 2 and 40 characters.':'クリエイター名は2〜40文字で入力してください。','Give your recipe a title between 2 and 80 characters.':'レシピ名は2〜80文字で入力してください。','Keep your description to 600 characters or fewer.':'紹介文は600文字以内で入力してください。','Cooking time must be a whole number from 1 to 600 minutes.':'調理時間は1〜600分の整数で入力してください。','Servings must be a whole number from 1 to 50.':'人数は1〜50の整数で入力してください。','Choose a category and difficulty.':'カテゴリーと難易度を選んでください。','Add at least one ingredient.':'材料を1つ以上追加してください。','Each ingredient needs a name (up to 120 characters) and an optional amount (up to 60).':'材料名は必須（120文字以内）、分量は任意（60文字以内）です。','Add at least one cooking step. Each step needs 2–500 characters.':'手順を1つ以上追加し、各手順を2〜500文字で入力してください。','Choose how your photo should fit the card.':'写真の表示方法を選んでください。',
  ' Your previous attachment is still selected.':' 前に選んだファイルはそのままです。','Choose an MP4, WebM or MOV video under 100 MB.':'100MB以下のMP4、WebM、MOV動画を選んでください。','Choose a JPG, PNG or WebP photo under 10 MB.':'10MB以下のJPG、PNG、WebP写真を選んでください。','Your upload session expired. Please try again.':'アップロード接続の期限が切れました。もう一度お試しください。','The upload service has not loaded. Refresh this page and try again.':'アップロードサービスを読み込めませんでした。ページを再読み込みしてください。','Finishing your upload…':'アップロードを完了しています…',
  'Publication did not finish. Your draft is still here. Click Publish recipe to try again.':'公開を完了できませんでした。入力内容は残っています。もう一度「レシピを公開」を押してください。','We could not confirm publication. Your recipe may already be live. Check its status before trying again; your draft and uploaded files have been kept.':'公開状態を確認できませんでした。すでに公開されている場合があります。状態を確認してください。入力内容とファイルは保持されています。','We could not publish your recipe. Your draft is still here.':'レシピを公開できませんでした。入力内容は残っています。','Your recipe is published. Refresh the feed to see it.':'レシピを公開しました。一覧を更新すると表示されます。','Check the publication status before starting over.':'最初からやり直す前に公開状態を確認してください。','Discard this unfinished recipe and start again?':'作成中のレシピを破棄して最初からやり直しますか？','Your unfinished recipe has been cleared.':'作成中のレシピを消去しました。','Your device could not open its share menu. Copy the link instead.':'共有メニューを開けませんでした。リンクをコピーしてください。','Add a recipe or clear your filters to find some inspiration.':'レシピを追加するか、絞り込みを解除してください。','Your name could not be saved.':'名前を保存できませんでした。','That recipe is no longer available. Explore something new.':'このレシピは現在利用できません。別のレシピを探してみよう。'
});

const dictionaries = { en: {}, ko, ja, ...EXTRA_DICTIONARIES };
const meta = {
  en: { title: 'Recipe Story — Good food. Worth sharing.', description: 'Recipe Story is a free photo and video recipe-sharing app. Discover Korean, Japanese, Chinese, Mexican, American, French, Italian and easy home-cooking recipes.', ogDescription: 'Discover, save and share real home-cooking recipes with photos, videos and clear steps.' },
  ko: { title: 'Recipe Story — 맛있는 이야기를 나눠요.', description: 'Recipe Story에서 사진과 영상으로 한식, 일식, 중식, 멕시칸, 아메리칸, 프렌치, 이탈리안과 간편 집밥 레시피를 발견하고 저장하고 공유하세요.', ogDescription: '사진, 영상과 쉬운 조리 순서로 진짜 집밥 레시피를 발견하고 저장하고 공유하세요.' },
  ja: { title: 'Recipe Story — おいしい物語をシェアしよう。', description: 'Recipe Storyで写真や動画の韓国料理、日本料理、中華、メキシコ、アメリカ、フランス、イタリア料理と簡単な家庭料理レシピを見つけて保存・シェア。', ogDescription: '写真、動画、わかりやすい手順で家庭料理のレシピを見つけ、保存してシェアしよう。' },
  ...EXTRA_META
};

function detectLanguage() {
  try { const stored = localStorage.getItem(STORAGE_KEY); if (SUPPORTED.includes(stored)) return stored; } catch { /* English remains available when storage is blocked. */ }
  return 'en';
}

let language = detectLanguage();
const reverse = {};
for (const locale of SUPPORTED.filter((locale) => locale !== 'en')) for (const [english, translated] of Object.entries(dictionaries[locale])) reverse[translated] ||= english;
const textKeys = new WeakMap();
const attributeKeys = new WeakMap();

export function getLanguage() { return language; }
export function t(key, vars = {}) {
  const english = reverse[key] || key;
  let value = language === 'en' ? english : dictionaries[language]?.[english] || english;
  for (const [name, replacement] of Object.entries(vars)) value = value.replaceAll(`{${name}}`, String(replacement));
  return value;
}
export function setLanguage(next) {
  if (!SUPPORTED.includes(next)) return language;
  language = next; try { localStorage.setItem(STORAGE_KEY, next); } catch { /* Switching still works for this visit. */ } applyTranslations();
  window.dispatchEvent(new CustomEvent('recipe-language-change', { detail: { language } }));
  return language;
}

function translateExact(value) {
  const canonical = reverse[value] || value;
  return language === 'en' ? canonical : dictionaries[language]?.[canonical] || value;
}

export function applyTranslations(root = document) {
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  document.title = meta[language].title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta[language].description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', meta[language].title);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', meta[language].ogDescription);
  const select = document.querySelector('#languageSelect'); if (select) select.value = language;
  const walker = document.createTreeWalker(root instanceof Document ? root.body : root, NodeFilter.SHOW_TEXT);
  const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement?.closest('script,style,#languageSelect,[data-no-translate],.recipe-card h3,.card-description,.detail-description,.ingredient-checklist,.cooking-steps')) continue;
    const raw = node.nodeValue; const trimmed = raw.trim(); if (!trimmed) continue;
    const canonical = textKeys.get(node) || reverse[trimmed] || trimmed; textKeys.set(node, canonical);
    const translated = language === 'en' ? canonical : dictionaries[language]?.[canonical] || canonical; node.nodeValue = raw.replace(trimmed, translated);
  }
  const scope = root instanceof Document ? root : root;
  scope.querySelectorAll?.('[placeholder],[aria-label],[title],optgroup[label]').forEach((element) => {
    let keys = attributeKeys.get(element); if (!keys) { keys = {}; attributeKeys.set(element, keys); }
    for (const attr of ['placeholder', 'aria-label', 'title', 'label']) if (element.hasAttribute(attr)) {
      const value = element.getAttribute(attr); const canonical = keys[attr] || reverse[value] || value; keys[attr] = canonical;
      element.setAttribute(attr, language === 'en' ? canonical : dictionaries[language]?.[canonical] || canonical);
    }
  });
}

export function localizeCount(count, saved = false) {
  if (language === 'ko') return `${count}개의 레시피${saved ? ' · 이 기기에 저장됨' : ''}`;
  if (language === 'ja') return `${count}件のレシピ${saved ? ' · この端末に保存済み' : ''}`;
  if (language === 'fr') return `${count} ${count === 1 ? 'recette' : 'recettes'}${saved ? ' · enregistrées sur cet appareil' : ''}`;
  if (language === 'it') return `${count} ${count === 1 ? 'ricetta' : 'ricette'}${saved ? ' · salvate su questo dispositivo' : ''}`;
  if (language === 'hi') return `${count} रेसिपी${saved ? ' · इस डिवाइस पर सहेजी गई' : ''}`;
  if (language === 'es-MX') return `${count} ${count === 1 ? 'receta' : 'recetas'}${saved ? ' · guardadas en este dispositivo' : ''}`;
  if (language === 'zh-CN') return `${count} 个食谱${saved ? ' · 已收藏在此设备' : ''}`;
  if (language === 'ar') return `${count} وصفة${saved ? ' · محفوظة على هذا الجهاز' : ''}`;
  return `${count} ${count === 1 ? 'recipe' : 'recipes'}${saved ? ' saved on this device' : ''}`;
}

export function localizeMinutes(value) {
  const units = { ko: '분', ja: '分', fr: ' min', it: ' min', hi: ' मिनट', 'es-MX': ' min', 'zh-CN': '分钟', ar: ' دقيقة' };
  return `${value}${units[language] ?? ' min'}`;
}
export function localizeServings(value) {
  if (language === 'ko') return `${value}인분`; if (language === 'ja') return `${value}人分`; if (language === 'fr') return `${value} ${Number(value) === 1 ? 'portion' : 'portions'}`;
  if (language === 'it') return `${value} ${Number(value) === 1 ? 'porzione' : 'porzioni'}`; if (language === 'hi') return `${value} सर्विंग`; if (language === 'es-MX') return `${value} ${Number(value) === 1 ? 'porción' : 'porciones'}`;
  if (language === 'zh-CN') return `${value} 份`; if (language === 'ar') return `${value} حصة`; return `${value} ${Number(value) === 1 ? 'serving' : 'servings'}`;
}
export function byline(author) {
  const formats = { ko: `${author}의 레시피`, ja: `${author}のレシピ`, fr: `PAR ${author}`, it: `DI ${author}`, hi: `${author} की रेसिपी`, 'es-MX': `POR ${author}`, 'zh-CN': `${author} 的食谱`, ar: `وصفة ${author}` };
  return formats[language] || `BY ${author}`;
}
export function confirmDelete(title) {
  const messages = { ko: `“${title}” 레시피를 삭제할까요? 삭제하면 되돌릴 수 없어요.`, ja: `「${title}」を削除しますか？元に戻せません。`, fr: `Supprimer « ${title} » ? Cette action est irréversible.`, it: `Eliminare “${title}”? L’operazione non può essere annullata.`, hi: `“${title}” को हटाएँ? इसे वापस नहीं किया जा सकता।`, 'es-MX': `¿Eliminar “${title}”? Esta acción no se puede deshacer.`, 'zh-CN': `要删除“${title}”吗？此操作无法撤销。`, ar: `هل تريد حذف «${title}»؟ لا يمكن التراجع عن ذلك.` };
  return messages[language] || `Delete “${title}”? This cannot be undone.`;
}

applyTranslations();
