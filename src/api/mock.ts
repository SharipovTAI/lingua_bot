import { ApiError, LEVELS } from './types'
import type {
  Attempt,
  ChatMessage,
  Conversation,
  Exercise,
  ExerciseKind,
  Level,
  MessageSendResult,
  PlacementAnswer,
  PlacementResult,
  Profile,
  ReviewCard,
  Scenario,
  Statistics,
  User,
  VocabularyWord,
  WordReview,
} from './types'

const DB_KEY = 'linguabot_local_db'
const TOKEN_KEY = 'linguabot_token'

type StoredUser = User & {
  password: string
  token: string | null
  profile: Profile
}

type StoredConversation = Conversation & { user_id: number }
type StoredMessage = ChatMessage & { conversation_id: number }
type StoredAttempt = Attempt & { user_id: number }
type StoredWord = VocabularyWord & { user_id: number }
type StoredReview = WordReview & { user_id: number }
type StoredPlacement = PlacementResult & { user_id: number; answers: PlacementAnswer[] }
type MockExercise = Exercise & { answer: string; explanation: string; is_placement: boolean }

type LocalDb = {
  nextUserId: number
  nextConversationId: number
  nextMessageId: number
  nextAttemptId: number
  nextWordId: number
  nextReviewId: number
  nextPlacementId: number
  users: StoredUser[]
  scenarios: Scenario[]
  conversations: StoredConversation[]
  messages: StoredMessage[]
  attempts: StoredAttempt[]
  vocabulary: StoredWord[]
  reviews: StoredReview[]
  placements: StoredPlacement[]
}

const scenarios: Scenario[] = [
  {
    id: 1,
    slug: 'cafe',
    title: 'В кафе',
    description: 'Заказ напитков и еды у бариста.',
  },
  {
    id: 2,
    slug: 'airport',
    title: 'В аэропорту',
    description: 'Регистрация на рейс и вопросы на стойке.',
  },
  {
    id: 3,
    slug: 'shop',
    title: 'В магазине',
    description: 'Покупка одежды и уточнение размера.',
  },
]

/** Тот же учебный банк, что и в learning/question_bank.py. */
const QUESTIONS: Array<[string, Level, ExerciseKind, string, string, string, string[], string]> = [
  ['a1-be', 'A1', 'grammar', 'be', 'She ___ a student.', 'is', ['am', 'are'], 'С she используется is.'],
  ['a1-cat', 'A1', 'vocabulary', 'animals', 'Как переводится cat?', 'кошка', ['собака', 'птица'], 'Cat — кошка.'],
  ['a1-want', 'A1', 'grammar', 'present-simple', 'I ___ a cup of tea.', 'want', ['wants', 'wanting'], 'После I используется want без -s.'],
  ['a1-water', 'A1', 'vocabulary', 'food', 'Как переводится water?', 'вода', ['хлеб', 'молоко'], 'Water — вода.'],
  ['a1-are', 'A1', 'grammar', 'be', 'They ___ at home.', 'are', ['is', 'am'], 'С they используется are.'],
  ['a1-dog', 'A1', 'vocabulary', 'animals', 'Как переводится dog?', 'собака', ['кошка', 'рыба'], 'Dog — собака.'],
  ['a2-past', 'A2', 'grammar', 'past-simple', 'Yesterday we ___ to the park.', 'went', ['go', 'gone'], 'Прошедшая форма go — went.'],
  ['a2-ticket', 'A2', 'vocabulary', 'travel', 'Как переводится ticket?', 'билет', ['багаж', 'вокзал'], 'Ticket — билет.'],
  ['a2-some', 'A2', 'grammar', 'quantifiers', 'There is ___ milk in the fridge.', 'some', ['many', 'a'], 'С неисчисляемым milk в утверждении используется some.'],
  ['a2-suitcase', 'A2', 'vocabulary', 'travel', 'Как переводится suitcase?', 'чемодан', ['билет', 'поезд'], 'Suitcase — чемодан.'],
  ['a2-drank', 'A2', 'grammar', 'past-simple', 'Yesterday I ___ some tea.', 'drank', ['drink', 'drunk'], 'Прошедшая форма drink — drank.'],
  ['a2-bread', 'A2', 'vocabulary', 'food', 'Как переводится bread?', 'хлеб', ['рис', 'сыр'], 'Bread — хлеб.'],
  ['b1-present-perfect', 'B1', 'grammar', 'present-perfect', 'I have ___ finished my homework.', 'already', ['yet', 'ever'], 'Already используется для уже завершённого действия.'],
  ['b1-advice', 'B1', 'vocabulary', 'communication', 'Как переводится advice?', 'совет', ['ошибка', 'спор'], 'Advice — совет.'],
  ['b1-since', 'B1', 'grammar', 'present-perfect', 'She has lived here ___ 2020.', 'since', ['for', 'during'], 'Since указывает момент начала.'],
  ['b1-opinion', 'B1', 'vocabulary', 'communication', 'Как переводится opinion?', 'мнение', ['решение', 'событие'], 'Opinion — мнение.'],
  ['b1-passive', 'B1', 'grammar', 'passive', 'This book ___ in 1990.', 'was written', ['wrote', 'has writing'], 'Пассив в прошлом — was + третья форма глагола.'],
  ['b1-journey', 'B1', 'vocabulary', 'travel', 'Как переводится journey?', 'путешествие', ['расписание', 'прибытие'], 'Journey — путешествие.'],
  ['b2-conditional', 'B2', 'grammar', 'conditionals', 'If I had known, I ___ helped.', 'would have', ['will have', 'would'], 'В третьем условном используется would have + причастие.'],
  ['b2-reliable', 'B2', 'vocabulary', 'qualities', 'Как переводится reliable?', 'надёжный', ['случайный', 'редкий'], 'Reliable — надёжный.'],
  ['b2-wish', 'B2', 'grammar', 'conditionals', 'I wish I ___ more time now.', 'had', ['have', 'will have'], 'Для нереальной ситуации в настоящем после wish используется прошедшая форма.'],
  ['b2-accurate', 'B2', 'vocabulary', 'qualities', 'Как переводится accurate?', 'точный', ['аккуратный', 'быстрый'], 'Accurate означает точный.'],
  ['b2-reported', 'B2', 'grammar', 'reported-speech', 'He said he ___ tired.', 'was', ['is being', 'will'], 'При согласовании времён is обычно переходит в was.'],
  ['b2-outcome', 'B2', 'vocabulary', 'results', 'Как переводится outcome?', 'результат', ['причина', 'срок'], 'Outcome — результат.'],
  ['c1-inversion', 'C1', 'grammar', 'inversion', 'Rarely ___ such dedication.', 'have I seen', ['I have seen', 'I saw'], 'После rarely в начале предложения используется инверсия.'],
  ['c1-ambiguous', 'C1', 'vocabulary', 'meaning', 'Как переводится ambiguous?', 'неоднозначный', ['очевидный', 'неизбежный'], 'Ambiguous допускает несколько толкований.'],
  ['c1-hardly', 'C1', 'grammar', 'inversion', 'Hardly had I arrived ___ it started raining.', 'when', ['than', 'then'], 'Конструкция hardly ... when.'],
  ['c1-feasible', 'C1', 'vocabulary', 'qualities', 'Как переводится feasible?', 'осуществимый', ['хрупкий', 'незаметный'], 'Feasible — осуществимый.'],
  ['c1-subjunctive', 'C1', 'grammar', 'subjunctive', 'It is essential that he ___ present.', 'be', ['is', 'was'], 'После essential that возможна форма сослагательного наклонения be.'],
  ['c1-implicit', 'C1', 'vocabulary', 'meaning', 'Как переводится implicit?', 'подразумеваемый', ['подробный', 'явный'], 'Implicit — подразумеваемый.'],
]

const exercises: MockExercise[] = QUESTIONS.map((row, index) => {
  const [, level, kind, topic, question, answer, distractors, explanation] = row
  const choices = [answer, ...distractors]
  const offset = index % choices.length
  return {
    id: index + 1,
    title: question,
    level,
    kind,
    topic,
    question,
    options: [...choices.slice(offset), ...choices.slice(0, offset)],
    answer,
    explanation,
    is_placement: index % 6 < 2,
  }
})

const placementIds = new Set(exercises.filter((item) => item.is_placement).map((item) => item.id))

function emptyDb(): LocalDb {
  return {
    nextUserId: 1,
    nextConversationId: 1,
    nextMessageId: 1,
    nextAttemptId: 1,
    nextWordId: 1,
    nextReviewId: 1,
    nextPlacementId: 1,
    users: [],
    scenarios,
    conversations: [],
    messages: [],
    attempts: [],
    vocabulary: [],
    reviews: [],
    placements: [],
  }
}

function loadDb(): LocalDb {
  const raw = localStorage.getItem(DB_KEY)
  const base = emptyDb()
  if (!raw) return base
  try {
    const parsed = JSON.parse(raw) as Partial<LocalDb>
    return {
      ...base,
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      scenarios: parsed.scenarios?.length ? parsed.scenarios : scenarios,
      conversations: parsed.conversations ?? [],
      messages: parsed.messages ?? [],
      attempts: parsed.attempts ?? [],
      vocabulary: parsed.vocabulary ?? [],
      reviews: parsed.reviews ?? [],
      placements: parsed.placements ?? [],
    }
  } catch {
    return base
  }
}

function saveDb(db: LocalDb) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

function delay() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 120)
  })
}

function fail(status: number, details: unknown, message: string): never {
  throw new ApiError(status, details, message)
}

function normalized(value: string) {
  return value.trim().toLocaleLowerCase('ru-RU').replace(/\s+/g, ' ')
}

function currentUser(db: LocalDb): StoredUser {
  const token = localStorage.getItem(TOKEN_KEY)
  const user = db.users.find((item) => item.token && item.token === token)
  if (!user) {
    fail(401, { detail: 'Учётные данные не были предоставлены.' }, 'Нужно войти снова.')
  }
  return user
}

function publicExercise(item: MockExercise): Exercise {
  return {
    id: item.id,
    title: item.title,
    level: item.level,
    kind: item.kind,
    topic: item.topic,
    question: item.question,
    options: item.options,
  }
}

function placementResult(item: StoredPlacement): PlacementResult {
  return {
    id: item.id,
    request_id: item.request_id,
    score: item.score,
    total: item.total,
    level: item.level,
    created_at: item.created_at,
  }
}

function reviewCard(item: StoredWord): ReviewCard {
  return { id: item.id, word: item.word, next_review: item.next_review }
}

function isDue(item: StoredWord) {
  return item.next_review === null || new Date(item.next_review).getTime() <= Date.now()
}

export function createMockApi() {
  return {
    async health() {
      await delay()
      return { status: 'ok' }
    },

    async register(email: string, password: string) {
      await delay()
      const db = loadDb()
      const normalizedEmail = email.trim().toLowerCase()
      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        fail(400, { email: ['Введите корректный email.'] }, 'Введите корректный email.')
      }
      if (!password) {
        fail(400, { password: ['Введите пароль.'] }, 'Введите пароль.')
      }
      if (db.users.some((item) => item.email === normalizedEmail)) {
        fail(
          400,
          { email: ['Пользователь с таким email уже зарегистрирован.'] },
          'Пользователь с таким email уже зарегистрирован.',
        )
      }

      const user: StoredUser = {
        id: db.nextUserId++,
        email: normalizedEmail,
        password,
        token: null,
        profile: { level: 'A1', goal: '', language: 'en' },
      }
      db.users.push(user)
      saveDb(db)
      return { user: { id: user.id, email: user.email } }
    },

    async login(email: string, password: string) {
      await delay()
      const db = loadDb()
      const normalizedEmail = email.trim().toLowerCase()
      const user = db.users.find(
        (item) => item.email === normalizedEmail && item.password === password,
      )
      if (!user) {
        fail(401, { detail: 'Неверный email или пароль.' }, 'Неверный email или пароль.')
      }
      user.token = `local-${crypto.randomUUID()}`
      saveDb(db)
      return { token: user.token, user: { id: user.id, email: user.email } }
    },

    async logout() {
      await delay()
      const db = loadDb()
      const token = localStorage.getItem(TOKEN_KEY)
      const user = db.users.find((item) => item.token === token)
      if (user) user.token = null
      saveDb(db)
      return null
    },

    async profile() {
      await delay()
      const db = loadDb()
      return { ...currentUser(db).profile }
    },

    async updateProfile(data: Partial<Profile>) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      if (data.level !== undefined && !LEVELS.includes(data.level as Level)) {
        fail(400, { level: ['Недопустимый уровень.'] }, 'Недопустимый уровень.')
      }
      if (data.goal !== undefined && data.goal.length > 200) {
        fail(400, { goal: ['Не длиннее 200 символов.'] }, 'Не длиннее 200 символов.')
      }
      user.profile = {
        ...user.profile,
        ...(data.level ? { level: data.level } : {}),
        ...(data.goal !== undefined ? { goal: data.goal } : {}),
        language: 'en',
      }
      saveDb(db)
      return { ...user.profile }
    },

    async scenarios() {
      await delay()
      return loadDb().scenarios.map((item) => ({ ...item }))
    },

    async conversations() {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      return db.conversations
        .filter((item) => item.user_id === user.id)
        .map((item) => ({
          id: item.id,
          scenario_id: item.scenario_id,
          scenario_title: item.scenario_title,
          created_at: item.created_at,
        }))
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
    },

    async createConversation(scenarioId: number) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const scenario = db.scenarios.find((item) => item.id === scenarioId)
      if (!scenario) {
        fail(400, { scenario_id: ['Сценарий не найден.'] }, 'Сценарий не найден.')
      }
      const conversation: StoredConversation = {
        id: db.nextConversationId++,
        user_id: user.id,
        scenario_id: scenario.id,
        scenario_title: scenario.title,
        created_at: new Date().toISOString(),
      }
      db.conversations.push(conversation)
      saveDb(db)
      return {
        id: conversation.id,
        scenario_id: conversation.scenario_id,
        scenario_title: conversation.scenario_title,
        created_at: conversation.created_at,
      }
    },

    async history(conversationId: number) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const conversation = db.conversations.find((item) => item.id === conversationId)
      if (!conversation || conversation.user_id !== user.id) {
        fail(404, { detail: 'Диалог не найден.' }, 'Диалог не найден.')
      }
      return db.messages
        .filter((item) => item.conversation_id === conversationId)
        .map((item) => ({
          id: item.id,
          role: item.role,
          content: item.content,
          feedback: item.feedback,
          created_at: item.created_at,
        }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
    },

    async send(conversationId: number, content: string): Promise<MessageSendResult> {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const conversation = db.conversations.find((item) => item.id === conversationId)
      if (!conversation || conversation.user_id !== user.id) {
        fail(404, { detail: 'Диалог не найден.' }, 'Диалог не найден.')
      }
      const text = content.trim()
      if (!text) {
        fail(400, { content: ['Введите сообщение.'] }, 'Введите сообщение.')
      }
      if (text.length > 2000) {
        fail(400, { content: ['Не длиннее 2000 символов.'] }, 'Не длиннее 2000 символов.')
      }
      const message: StoredMessage = {
        id: db.nextMessageId++,
        conversation_id: conversationId,
        role: 'user',
        content: text,
        feedback: {},
        created_at: new Date().toISOString(),
      }
      db.messages.push(message)
      saveDb(db)
      return {
        user_message: {
          id: message.id,
          role: message.role,
          content: message.content,
          feedback: message.feedback,
          created_at: message.created_at,
        },
        assistant_message: null,
        feedback: [],
      }
    },

    async placement() {
      await delay()
      return exercises.filter((item) => item.is_placement).map(publicExercise)
    },

    async submitPlacement(requestId: string, answers: PlacementAnswer[]) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const previous = db.placements.find(
        (item) => item.user_id === user.id && item.request_id === requestId,
      )
      if (previous) return placementResult(previous)

      const ids = new Set(answers.map((item) => item.exercise_id))
      if (answers.length !== placementIds.size || ids.size !== placementIds.size) {
        fail(400, { answers: ['Нужен один ответ на каждый из 10 вопросов теста.'] }, 'Нужен ответ на каждый вопрос.')
      }
      const bank = new Map(exercises.map((item) => [item.id, item]))
      const score = answers.reduce((total, item) => {
        const exercise = bank.get(item.exercise_id)
        return total + (exercise && normalized(item.answer) === normalized(exercise.answer) ? 1 : 0)
      }, 0)
      const level = LEVELS[Math.min(Math.floor(score / 2), 4)]
      const result: StoredPlacement = {
        id: db.nextPlacementId++,
        user_id: user.id,
        request_id: requestId,
        answers,
        score,
        total: 10,
        level,
        created_at: new Date().toISOString(),
      }
      db.placements.push(result)
      user.profile.level = level
      saveDb(db)
      return placementResult(result)
    },

    async exercises(kind?: ExerciseKind) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      if (kind && kind !== 'grammar' && kind !== 'vocabulary') {
        fail(400, { kind: ['Допустимы grammar и vocabulary.'] }, 'Недопустимый тип.')
      }
      const own = db.attempts
        .filter((item) => item.user_id === user.id)
        .slice()
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
      const latest = new Map<number, StoredAttempt>()
      for (const item of own) {
        if (!latest.has(item.exercise_id)) latest.set(item.exercise_id, item)
      }
      const topics = new Set(
        [...latest.values()]
          .filter((item) => !item.is_correct)
          .map((item) => bank(item.exercise_id)?.topic)
          .filter(Boolean),
      )
      const level = user.profile.level
      const result = exercises
        .filter((item) => !item.is_placement && item.level === level)
        .filter((item) => !kind || item.kind === kind)
        .sort((a, b) => {
          const aTopic = topics.has(a.topic) ? 0 : 1
          const bTopic = topics.has(b.topic) ? 0 : 1
          const aLast = latest.get(a.id)
          const bLast = latest.get(b.id)
          const aSolved = aLast?.is_correct ? 1 : 0
          const bSolved = bLast?.is_correct ? 1 : 0
          return aTopic - bTopic || aSolved - bSolved || a.id - b.id
        })
      return result.map(publicExercise)
    },

    async attempt(exerciseId: number, answer: string, requestId: string) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const previous = db.attempts.find(
        (item) => item.user_id === user.id && item.request_id === requestId,
      )
      if (previous) {
        if (previous.exercise_id === exerciseId && previous.answer === answer) {
          return attemptData(previous)
        }
        fail(400, { request_id: 'Этот request_id уже использован с другими данными.' }, 'Повтор с другими данными.')
      }
      const exercise = exercises.find((item) => item.id === exerciseId && !item.is_placement)
      if (!exercise) {
        fail(404, { detail: 'Упражнение не найдено.' }, 'Упражнение не найдено.')
      }
      if (!answer.trim()) {
        fail(400, { answer: ['Введите ответ.'] }, 'Введите ответ.')
      }
      const attempt: StoredAttempt = {
        id: db.nextAttemptId++,
        user_id: user.id,
        request_id: requestId,
        exercise_id: exercise.id,
        answer,
        is_correct: normalized(answer) === normalized(exercise.answer),
        correct_answer: exercise.answer,
        explanation: exercise.explanation,
        created_at: new Date().toISOString(),
      }
      db.attempts.push(attempt)
      saveDb(db)
      return attemptData(attempt)
    },

    async vocabulary() {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      return db.vocabulary
        .filter((item) => item.user_id === user.id)
        .map(wordData)
        .sort((a, b) => a.word.localeCompare(b.word) || a.id - b.id)
    },

    async addWord(word: string, translation: string) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const normalizedWord = normalized(word)
      if (!normalizedWord || !translation.trim()) {
        fail(400, { word: ['Введите слово и перевод.'] }, 'Введите слово и перевод.')
      }
      const existing = db.vocabulary.find(
        (item) => item.user_id === user.id && normalized(item.word) === normalizedWord,
      )
      if (existing) {
        if (existing.translation !== translation) {
          fail(
            400,
            { word: 'Слово уже есть. Измените перевод через PATCH.' },
            'Слово уже есть. Измените перевод через редактирование.',
          )
        }
        return wordData(existing)
      }
      const item: StoredWord = {
        id: db.nextWordId++,
        user_id: user.id,
        word: normalizedWord,
        translation: translation.trim(),
        next_review: null,
        streak: 0,
      }
      db.vocabulary.push(item)
      saveDb(db)
      return wordData(item)
    },

    async updateWord(wordId: number, data: Partial<Pick<VocabularyWord, 'word' | 'translation'>>) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const item = db.vocabulary.find((word) => word.id === wordId && word.user_id === user.id)
      if (!item) fail(404, { detail: 'Слово не найдено.' }, 'Слово не найдено.')
      if (!data.word && !data.translation) {
        fail(400, { detail: 'Передайте слово или перевод.' }, 'Передайте слово или перевод.')
      }
      if (data.word) {
        const normalizedWord = normalized(data.word)
        const duplicate = db.vocabulary.some(
          (word) =>
            word.id !== item.id &&
            word.user_id === user.id &&
            normalized(word.word) === normalizedWord,
        )
        if (duplicate) fail(400, { word: 'Такое слово уже есть в словаре.' }, 'Такое слово уже есть.')
        item.word = normalizedWord
      }
      if (data.translation) item.translation = data.translation.trim()
      item.streak = 0
      item.next_review = null
      saveDb(db)
      return wordData(item)
    },

    async deleteWord(wordId: number) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const index = db.vocabulary.findIndex(
        (word) => word.id === wordId && word.user_id === user.id,
      )
      if (index < 0) fail(404, { detail: 'Слово не найдено.' }, 'Слово не найдено.')
      db.vocabulary.splice(index, 1)
      db.reviews = db.reviews.filter((item) => item.word_id !== wordId)
      saveDb(db)
      return null
    },

    async reviewCards() {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      return db.vocabulary
        .filter((item) => item.user_id === user.id && isDue(item))
        .sort((a, b) => (a.next_review ?? '').localeCompare(b.next_review ?? '') || a.id - b.id)
        .map(reviewCard)
    },

    async reviewWord(wordId: number, answer: string, requestId: string) {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const previous = db.reviews.find(
        (item) => item.user_id === user.id && item.request_id === requestId,
      )
      if (previous) {
        if (previous.word_id === wordId && previous.answer === answer) {
          return reviewData(previous)
        }
        fail(400, { request_id: 'Этот request_id уже использован с другими данными.' }, 'Повтор с другими данными.')
      }
      const word = db.vocabulary.find((item) => item.id === wordId && item.user_id === user.id)
      if (!word) fail(404, { detail: 'Слово не найдено.' }, 'Слово не найдено.')
      if (!isDue(word)) {
        fail(400, { detail: 'Время следующего повторения ещё не наступило.' }, 'Повтор ещё не наступил.')
      }
      const correct = normalized(answer) === normalized(word.translation)
      const streak = correct ? Math.min(word.streak + 1, 5) : 0
      const interval = correct
        ? [1, 3, 7, 14, 30][streak - 1]
        : 0
      const next = new Date(Date.now() + (correct ? interval * 24 * 60 * 60 * 1000 : 60 * 60 * 1000))
      const nextISO = next.toISOString()
      const review: StoredReview = {
        id: db.nextReviewId++,
        user_id: user.id,
        request_id: requestId,
        word_id: word.id,
        answer,
        is_correct: correct,
        translation: word.translation,
        next_review: nextISO,
        created_at: new Date().toISOString(),
      }
      db.reviews.push(review)
      word.streak = streak
      word.next_review = nextISO
      saveDb(db)
      return reviewData(review)
    },

    async statistics(): Promise<Statistics> {
      await delay()
      const db = loadDb()
      const user = currentUser(db)
      const attempts = db.attempts.filter((item) => item.user_id === user.id)
      const correct = attempts.filter((item) => item.is_correct).length
      const byKind: Record<string, { attempts: number; correct: number }> = {}
      for (const item of attempts) {
        const kind = exercises.find((exercise) => exercise.id === item.exercise_id)?.kind ?? 'grammar'
        byKind[kind] = byKind[kind] ?? { attempts: 0, correct: 0 }
        byKind[kind].attempts += 1
        if (item.is_correct) byKind[kind].correct += 1
      }
      const words = db.vocabulary.filter((item) => item.user_id === user.id)
      const reviews = db.reviews.filter((item) => item.user_id === user.id)
      const placement = db.placements
        .filter((item) => item.user_id === user.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)[0]
      const conversations = db.conversations.filter((item) => item.user_id === user.id)
      const messages = db.messages.filter((item) =>
        conversations.some((conversation) => conversation.id === item.conversation_id),
      )
      return {
        level: user.profile.level,
        attempts: attempts.length,
        correct,
        accuracy: attempts.length ? Math.round((correct / attempts.length) * 1000) / 10 : 0,
        completed_exercises: new Set(
          attempts.filter((item) => item.is_correct).map((item) => item.exercise_id),
        ).size,
        by_kind: byKind,
        vocabulary_words: words.length,
        words_due: words.filter(isDue).length,
        word_reviews: reviews.length,
        correct_reviews: reviews.filter((item) => item.is_correct).length,
        conversations: conversations.length,
        user_messages: messages.filter((item) => item.role === 'user').length,
        placement: placement ? placementResult(placement) : null,
      }
    },
  }
}

function bank(id: number) {
  return exercises.find((item) => item.id === id)
}

function attemptData(item: StoredAttempt): Attempt {
  return {
    id: item.id,
    request_id: item.request_id,
    exercise_id: item.exercise_id,
    answer: item.answer,
    is_correct: item.is_correct,
    correct_answer: item.correct_answer,
    explanation: item.explanation,
    created_at: item.created_at,
  }
}

function wordData(item: StoredWord): VocabularyWord {
  return {
    id: item.id,
    word: item.word,
    translation: item.translation,
    next_review: item.next_review,
    streak: item.streak,
  }
}

function reviewData(item: StoredReview): WordReview {
  return {
    id: item.id,
    request_id: item.request_id,
    word_id: item.word_id,
    answer: item.answer,
    is_correct: item.is_correct,
    translation: item.translation,
    next_review: item.next_review,
    created_at: item.created_at,
  }
}
