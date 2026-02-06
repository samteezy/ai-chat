import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InlineCode } from '@/components/chat/InlineCode';

describe('InlineCode', () => {
  describe('rendering', () => {
    it('renders code content', () => {
      render(<InlineCode>someVariable</InlineCode>);

      expect(screen.getByText('someVariable')).toBeInTheDocument();
    });

    it('renders as a code element', () => {
      render(<InlineCode>myFunction()</InlineCode>);

      const codeElement = screen.getByText('myFunction()');
      expect(codeElement.tagName).toBe('CODE');
    });

    it('renders children correctly', () => {
      render(<InlineCode>complex.nested.property</InlineCode>);

      expect(screen.getByText('complex.nested.property')).toBeInTheDocument();
    });
  });

  describe('styling', () => {
    it('has correct background color classes', () => {
      render(<InlineCode>code</InlineCode>);

      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('bg-gray-200', 'dark:bg-gray-700');
    });

    it('has correct text color classes', () => {
      render(<InlineCode>code</InlineCode>);

      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('text-pink-600', 'dark:text-pink-400');
    });

    it('has correct padding and border radius', () => {
      render(<InlineCode>code</InlineCode>);

      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('px-1.5', 'py-0.5', 'rounded');
    });

    it('has monospace font', () => {
      render(<InlineCode>code</InlineCode>);

      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('font-mono');
    });

    it('has small text size', () => {
      render(<InlineCode>code</InlineCode>);

      const codeElement = screen.getByText('code');
      expect(codeElement).toHaveClass('text-sm');
    });
  });
});
