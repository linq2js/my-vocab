/**
 * PlayPage component for MyVocab PWA.
 *
 * A fun exercise screen where users can practice their vocabulary by listening
 * to pronunciation and typing the word, definition, and examples.
 *
 * Features:
 * - Audio playback for vocabulary text
 * - Input fields for text, definition, and example
 * - Score tracking (correct, wrong, skipped)
 * - Progress through vocabulary list
 * - Only text field is validated (definition/example are optional practice)
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'atomirx/react';
import { PageLayout } from '../components/templates/PageLayout';
import { Button } from '../components/atoms/Button';
import { Input } from '../components/atoms/Input';
import { Icon } from '../components/atoms/Icon';
import { vocabStore } from '../stores/vocab.store';
import { useSpeech } from '../hooks/useSpeech';
import type { Vocabulary } from '../types/vocabulary';

/**
 * Result state for a single question
 */
type QuestionResult = 'correct' | 'wrong' | 'skipped' | null;

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j] as T;
    shuffled[j] = temp as T;
  }
  return shuffled;
}

/**
 * PlayPage component - vocabulary practice/quiz screen.
 */
export const PlayPage = (): React.ReactElement => {
  const { speak, isSupported } = useSpeech();
  
  // Get all vocabularies from store
  const allVocabularies = useSelector(vocabStore.items$);
  
  // Shuffled list for the session
  const [shuffledItems, setShuffledItems] = useState<Vocabulary[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Stats
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  
  // Current question state
  const [textAnswer, setTextAnswer] = useState('');
  const [definitionAnswer, setDefinitionAnswer] = useState('');
  const [exampleAnswer, setExampleAnswer] = useState('');
  const [result, setResult] = useState<QuestionResult>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  // Initialize vocab store
  useEffect(() => {
    vocabStore.init().catch(console.error);
  }, []);

  // Current vocabulary item
  const currentItem = useMemo(() => {
    if (shuffledItems.length === 0 || currentIndex >= shuffledItems.length) {
      return null;
    }
    return shuffledItems[currentIndex];
  }, [shuffledItems, currentIndex]);

  /**
   * Start the game with shuffled vocabularies
   */
  const handleStart = useCallback(() => {
    if (allVocabularies.length === 0) return;
    
    const shuffled = shuffleArray(allVocabularies);
    setShuffledItems(shuffled);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setIsStarted(true);
    setIsFinished(false);
    setResult(null);
    setTextAnswer('');
    setDefinitionAnswer('');
    setExampleAnswer('');
    setHasPlayed(false);
  }, [allVocabularies]);

  /**
   * Play the current word's pronunciation
   */
  const handlePlaySound = useCallback(() => {
    if (currentItem && isSupported) {
      speak(currentItem.text, currentItem.language);
      setHasPlayed(true);
    }
  }, [currentItem, isSupported, speak]);

  /**
   * Submit answer and check if correct
   */
  const handleSubmit = useCallback(() => {
    if (!currentItem || result !== null) return;

    // Normalize both strings for comparison (lowercase, trim)
    const userText = textAnswer.trim().toLowerCase();
    const correctText = currentItem.text.trim().toLowerCase();

    if (userText === correctText) {
      setResult('correct');
      setCorrectCount(prev => prev + 1);
    } else {
      setResult('wrong');
      setWrongCount(prev => prev + 1);
    }
  }, [currentItem, textAnswer, result]);

  /**
   * Skip current question (counts as wrong)
   */
  const handleSkip = useCallback(() => {
    if (!currentItem || result !== null) return;
    
    setResult('skipped');
    setWrongCount(prev => prev + 1);
  }, [currentItem, result]);

  /**
   * Move to next question
   */
  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= shuffledItems.length) {
      setIsFinished(true);
    } else {
      setCurrentIndex(prev => prev + 1);
      setTextAnswer('');
      setDefinitionAnswer('');
      setExampleAnswer('');
      setResult(null);
      setHasPlayed(false);
    }
  }, [currentIndex, shuffledItems.length]);

  /**
   * Restart the game
   */
  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  // Calculate total items for navigation
  const totalItems = shuffledItems.length;

  // Render start screen
  if (!isStarted) {
    return (
      <PageLayout>
        <div className="max-w-md mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back to home"
            >
              <Icon name="chevron-left" size="md" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Play
            </h2>
          </div>

          <div className="text-center">
            <div className="mb-8">
              <div className="w-28 h-28 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Icon name="volume" size="xl" className="text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                Listen and type what you hear!
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 rounded-xl p-6 mb-8">
              <div className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {allVocabularies.length}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                words to practice
              </div>
            </div>

            {allVocabularies.length > 0 ? (
              <Button onClick={handleStart} size="lg" className="w-full">
                Start Playing
              </Button>
            ) : (
              <div className="text-gray-500 dark:text-gray-400">
                <p className="mb-4">No vocabulary items yet.</p>
                <Link to="/add">
                  <Button variant="outline">Add Your First Word</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  // Render finished screen
  if (isFinished) {
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

    return (
      <PageLayout>
        <div className="max-w-md mx-auto">
          {/* Page Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              to="/"
              className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back to home"
            >
              <Icon name="chevron-left" size="md" />
            </Link>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Play
            </h2>
          </div>

          <div className="text-center">
            <div className="mb-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Icon name="check" size="lg" className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Well Done!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                You've completed the session
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {correctCount}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">Correct</div>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 rounded-xl p-4">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {wrongCount}
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">Wrong</div>
              </div>
            </div>

            {/* Accuracy */}
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-xl p-6 mb-8">
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                {accuracy}%
              </div>
              <div className="text-sm text-purple-700 dark:text-purple-300">Accuracy</div>
            </div>

            <Button onClick={handleRestart} size="lg" className="w-full">
              Play Again
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Render game screen
  return (
    <PageLayout>
      <div className="max-w-md mx-auto">
        {/* Page Header */}
        <div className="flex items-center gap-4 mb-4">
          <Link
            to="/"
            className="p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label="Back to home"
          >
            <Icon name="chevron-left" size="md" />
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Play
          </h2>
        </div>

        {/* Audio button and stats row */}
        <div className="flex items-center justify-between mb-6">
          {/* Audio button left */}
          <button
            onClick={handlePlaySound}
            disabled={!isSupported}
            className={`
              w-20 h-20 rounded-full flex items-center justify-center
              transition-all duration-200 transform hover:scale-105
              ${hasPlayed 
                ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg'
              }
              ${!isSupported ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            aria-label="Play pronunciation"
          >
            <Icon name="volume" size="lg" />
          </button>

          {/* Stats right */}
          <div className="flex items-center gap-1">
            <span className="text-green-600 dark:text-green-400 font-bold text-2xl tabular-nums">
              {correctCount} ✓
            </span>
            <span className="text-gray-400 dark:text-gray-600 mx-2">|</span>
            <span className="text-red-500 dark:text-red-400 font-bold text-2xl tabular-nums">
              {wrongCount} ✗
            </span>
            <span className="text-gray-400 dark:text-gray-600 mx-2">|</span>
            <span className="text-blue-500 dark:text-blue-400 font-bold text-2xl tabular-nums">
              {totalItems - currentIndex - (result ? 1 : 0)} +
            </span>
          </div>
        </div>

        {!isSupported && (
          <p className="text-center text-sm text-red-500 mb-4">
            Speech not supported in this browser
          </p>
        )}

        {/* Main content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {/* Input fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                What word did you hear? <span className="text-red-500">*</span>
              </label>
              <Input
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder="Type the word..."
                disabled={result !== null}
                fullWidth
                className={result !== null ? (
                  result === 'correct' 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                ) : ''}
              />
              {result !== null && result !== 'correct' && currentItem && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  Correct answer: <strong>{currentItem.text}</strong>
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Definition <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                value={definitionAnswer}
                onChange={(e) => setDefinitionAnswer(e.target.value)}
                placeholder="What does it mean?"
                disabled={result !== null}
                fullWidth
              />
              {result !== null && currentItem?.definition && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {currentItem.definition}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Example <span className="text-gray-400">(optional)</span>
              </label>
              <Input
                value={exampleAnswer}
                onChange={(e) => setExampleAnswer(e.target.value)}
                placeholder="Use it in a sentence..."
                disabled={result !== null}
                fullWidth
              />
              {result !== null && currentItem?.examples && currentItem.examples.length > 0 && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                  {currentItem.examples[0]}
                </p>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="mt-6 flex gap-3">
            {result === null ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!textAnswer.trim()}
                  className="flex-1"
                >
                  Submit
                </Button>
              </>
            ) : (
              <>
                <div className={`
                  flex-1 py-2 px-4 rounded-lg text-center font-medium
                  ${result === 'correct' 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  }
                `}>
                  {result === 'correct' && 'Correct'}
                  {result === 'wrong' && 'Incorrect'}
                  {result === 'skipped' && 'Skipped'}
                </div>
                <Button
                  onClick={handleNext}
                  className="flex-1"
                >
                  {currentIndex + 1 >= totalItems ? 'See Results' : 'Next'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};
