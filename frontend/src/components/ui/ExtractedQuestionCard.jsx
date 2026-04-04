import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Tag, BookOpen, Layers } from 'lucide-react';

const TYPE_COLORS = {
  concept_point: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  example_match: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  definition:    'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  short_concept: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

const QUESTION_TYPE_LABEL = {
  definition:    '📖 Definition',
  explanation:   '💡 Explanation',
  reasoning:     '🧠 Reasoning',
  comparison:    '⚖️ Comparison',
  numerical:     '🔢 Numerical',
  listing:       '📋 Listing',
  short_concept: '✏️ Short Concept',
};

export default function ExtractedQuestionCard({ question, index }) {
  const [expanded, setExpanded] = useState(index === 0);

  const typeColor = TYPE_COLORS[question.questionType] || TYPE_COLORS.short_concept;
  const typeLabel = QUESTION_TYPE_LABEL[question.questionType] || question.questionType;

  return (
    <div className="premium-card p-0 overflow-hidden mb-4 border border-slate-800 transition-colors hover:border-slate-700">
      {/* Header */}
      <div
        className="flex items-center justify-between p-5 bg-slate-900 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/20 text-sm">
            {question.questionId}
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-200">{question.questionPrompt || 'Blank Prompt'}</h4>
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-xs font-medium px-2 py-0.5 rounded border ${typeColor}`}>
                {typeLabel}
              </span>
              <span className="text-xs text-slate-400">
                {question.marks != null ? `${question.marks} marks` : 'Marks TBD'}
              </span>
              <span className="text-xs text-slate-500">
                {question.rules?.length || 0} rubric points
              </span>
            </div>
          </div>
        </div>
        <div className="text-slate-400">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
      </div>

      {/* Expanded rubric points */}
      {expanded && (
        <div className="p-5 border-t border-slate-800 bg-slate-900/50 space-y-3">
          {question.rules?.length === 0 && (
            <p className="text-sm text-slate-500 italic">No rubric points extracted. Check document format.</p>
          )}

          {question.rules?.map((rule, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 hover:border-indigo-500/30 transition-colors"
            >
              {/* Point header */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                    Concept Point
                  </span>
                  {rule.weight != null && (
                    <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {rule.weight} {rule.weight === 1 ? 'mark' : 'marks'}
                    </span>
                  )}
                </div>
              </div>

              {/* Point text */}
              <p className="text-slate-200 font-medium mb-3">{rule.description}</p>

              {/* Concept meaning */}
              {rule.concept_meaning && rule.concept_meaning !== rule.description && (
                <div className="flex items-start gap-2 mb-2">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-sky-300 italic">{rule.concept_meaning}</p>
                </div>
              )}

              {/* Keywords */}
              {rule.keywords?.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <Tag className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                  {rule.keywords.map((kw, ki) => (
                    <span key={ki} className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 border border-slate-600">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* Alternate phrases */}
              {rule.alternate_phrases?.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Layers className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs text-slate-500 font-medium">Accepted alternates:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rule.alternate_phrases.map((phrase, pi) => (
                      <span key={pi} className="text-xs px-2 py-0.5 rounded bg-slate-700/60 text-slate-400 border border-slate-600/60 italic">
                        "{phrase}"
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
