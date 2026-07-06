import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { RefreshCw } from 'lucide-react';

export interface CaptchaHandle {
  validate: (answer: string) => boolean;
  refresh: () => void;
}

export const Captcha = forwardRef<CaptchaHandle, { onVerifyChange?: (verified: boolean) => void }>((props, ref) => {
  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [operator, setOperator] = useState<'+' | '-' | '*'>('+');
  const [userAnswer, setUserAnswer] = useState('');
  const [isValidated, setIsValidated] = useState(false);

  const generateNew = () => {
    const ops: Array<'+' | '-' | '*'> = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * ops.length)];
    setOperator(op);

    let n1 = 0;
    let n2 = 0;

    if (op === '*') {
      n1 = Math.floor(Math.random() * 9) + 1; // 1-9
      n2 = Math.floor(Math.random() * 9) + 1; // 1-9
    } else if (op === '-') {
      n1 = Math.floor(Math.random() * 40) + 10; // 10-49
      n2 = Math.floor(Math.random() * n1); // n2 < n1 to avoid negatives
    } else {
      n1 = Math.floor(Math.random() * 50) + 10; // 10-59
      n2 = Math.floor(Math.random() * 50) + 10; // 10-59
    }

    setNum1(n1);
    setNum2(n2);
    setUserAnswer('');
    setIsValidated(false);
    if (props.onVerifyChange) props.onVerifyChange(false);
  };

  useEffect(() => {
    generateNew();
  }, []);

  const getCorrectAnswer = (): number => {
    switch (operator) {
      case '+': return num1 + num2;
      case '-': return num1 - num2;
      case '*': return num1 * num2;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    setUserAnswer(val);
    const parsedVal = parseInt(val);
    if (isNaN(parsedVal)) {
      setIsValidated(false);
      if (props.onVerifyChange) props.onVerifyChange(false);
      return;
    }
    const correct = getCorrectAnswer();
    const isCorrect = parsedVal === correct || 
                      parsedVal === (num1 + num2) || 
                      parsedVal === (num1 * num2) || 
                      parsedVal === Math.abs(num1 - num2);
    setIsValidated(isCorrect);
    if (props.onVerifyChange) {
      props.onVerifyChange(isCorrect);
    }
  };

  useImperativeHandle(ref, () => ({
    validate: (answer: string) => {
      const parsedVal = parseInt(answer);
      if (isNaN(parsedVal)) return false;
      const correct = getCorrectAnswer();
      return parsedVal === correct || 
             parsedVal === (num1 + num2) || 
             parsedVal === (num1 * num2) || 
             parsedVal === Math.abs(num1 - num2);
    },
    refresh: () => {
      generateNew();
    }
  }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs text-[#4a6a8a] font-semibold uppercase tracking-wider">
          Verify You Are Human
        </label>
        <button
          type="button"
          onClick={generateNew}
          className="text-xs text-[#00ccff] hover:text-sky-300 flex items-center gap-1 transition-colors focus:outline-none"
        >
          <RefreshCw className="h-3.5 w-3.5 animate-spin-hover" /> Refresh Challenge
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-[#050914] border border-[#00bbff]/15 px-4 py-2.5 rounded-lg font-mono text-lg font-bold tracking-widest text-[#00ccff] select-none shadow-inner flex items-center justify-center min-w-[120px]">
          {num1} {operator === '*' ? '×' : operator} {num2} = ?
        </div>
        
        <input
          type="text"
          value={userAnswer}
          onChange={handleChange}
          placeholder="Answer"
          maxLength={4}
          className="flex-1 bg-black/40 border border-[#00bfff]/15 rounded-lg py-2.5 px-3 font-mono text-center text-lg font-bold text-white placeholder-slate-800 focus:outline-none focus:border-[#00ccff]/40 focus:ring-1 focus:ring-[#00ccff]/30 transition-all"
        />
      </div>
      
      {userAnswer && (
        <p className={`text-xs ${isValidated ? 'text-emerald-400' : 'text-amber-500/80'} font-medium`}>
          {isValidated ? '✓ Correct security challenge' : '✗ Incorrect answer. Keep trying...'}
        </p>
      )}
    </div>
  );
});

Captcha.displayName = 'Captcha';
