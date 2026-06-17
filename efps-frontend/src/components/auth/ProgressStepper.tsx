'use client';

import { Check } from 'lucide-react';

interface Step {
  label: string;
}

interface ProgressStepperProps {
  steps: Step[];
  currentStep: number;
}

export function ProgressStepper({ steps, currentStep }: ProgressStepperProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 32 }}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;

        return (
          <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  backgroundColor: isCompleted
                    ? '#0F172A'
                    : isActive
                      ? '#0F172A'
                      : '#F1F5F9',
                  color: isCompleted || isActive ? '#FFFFFF' : '#94A3B8',
                  transition: 'all 0.2s ease',
                }}
              >
                {isCompleted ? <Check size={16} /> : <span>{index + 1}</span>}
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#0F172A' : '#94A3B8',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.2s ease',
                }}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                style={{
                  width: 48,
                  height: 2,
                  backgroundColor: isCompleted ? '#0F172A' : '#E6E8EB',
                  marginBottom: 22,
                  transition: 'background-color 0.2s ease',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
