import { resolveApiAssetUrl } from '../../../shared/api/axiosInstance'

type QuestionAnswer = {
  id: number
  text: string
  isCorrect: boolean
}

type TestQuestion = {
  id: number
  text: string
  type: 'multiple-choice' | 'text' | 'true-false'
  imageUrl?: string | null
  correctTextAnswer?: string | null
  answers: QuestionAnswer[]
}

type QuestionCardProps = {
  question: TestQuestion
  index: number
  selectedAnswerId?: number
  textAnswer?: string
  submitted: boolean
  onSelectAnswer: (answerId: number) => void
  onTextAnswer: (value: string) => void
}

export function QuestionCard({
  question,
  index,
  selectedAnswerId,
  textAnswer,
  submitted,
  onSelectAnswer,
  onTextAnswer,
}: QuestionCardProps) {
  const renderChoiceAnswers = () => (
    <div className="grid gap-3">
      {question.answers.map((answer) => {
        const isCorrect = submitted && answer.isCorrect
        const isWrong = submitted && selectedAnswerId === answer.id && !answer.isCorrect

        return (
          <button
            key={answer.id}
            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
              isCorrect
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : isWrong
                  ? 'border-rose-300 bg-rose-50 text-rose-700'
                  : selectedAnswerId === answer.id
                    ? 'border-cyan-300 bg-cyan-50 text-slate-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-slate-900'
            }`}
            disabled={submitted}
            onClick={() => onSelectAnswer(answer.id)}
            type="button"
          >
            {answer.text}
          </button>
        )
      })}
    </div>
  )

  const textIsCorrect =
    submitted &&
    question.correctTextAnswer &&
    textAnswer &&
    question.correctTextAnswer.trim().toLowerCase() === textAnswer.trim().toLowerCase()

  return (
    <article className="glass-panel p-6">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-100/60">
            Question {index + 1}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">{question.text}</h2>
        </div>

        {question.imageUrl ? (
          <img
            alt={`Question ${index + 1}`}
            className="max-h-80 w-full rounded-3xl object-cover"
            src={resolveApiAssetUrl(question.imageUrl)}
          />
        ) : null}

        {question.type === 'text' ? (
          <div className="space-y-3">
            <textarea
              className="min-h-28 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100"
              disabled={submitted}
              placeholder="Type your answer here"
              value={textAnswer ?? ''}
              onChange={(event) => onTextAnswer(event.target.value)}
            />
            {submitted ? (
              <div
                className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                  textIsCorrect
                    ? 'border border-emerald-300 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-300 bg-rose-50 text-rose-700'
                }`}
              >
                Correct answer: {question.correctTextAnswer}
              </div>
            ) : null}
          </div>
        ) : (
          renderChoiceAnswers()
        )}
      </div>
    </article>
  )
}
