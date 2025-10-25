import React from 'react';

interface Step {
  number: number;
  description: string | React.ReactNode;
}

interface HowItWorksProps {
  title?: string;
  steps: Step[];
}

export function HowItWorks({ 
  title = "How it works", 
  steps 
}: HowItWorksProps) {
  return (
    <div className="mt-12 p-8 bg-sand-1400 border border-border-low">
      {title && <h2 className="text-title-4 mb-6 font-diatype-medium">{title}</h2>}
      <ol className="space-y-4">
        {steps.map((step) => (
          <li key={step.number} className="flex items-start gap-3">
            <span className="bg-sand-100 text-sand-1500 rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-body-md font-inter-medium">
              {step.number}
            </span>
            <span className="text-body-l text-sand-100">{step.description}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

