import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeBlock } from '@/components/chat/CodeBlock';

// Mock prism-react-renderer
vi.mock('prism-react-renderer', () => ({
  Highlight: ({ code, language, children }: {
    code: string;
    language: string;
    children: (props: {
      className: string;
      style: object;
      tokens: { type: string; content: string }[][];
      getLineProps: (opts: { line: { type: string; content: string }[] }) => object;
      getTokenProps: (opts: { token: { type: string; content: string } }) => object;
    }) => React.ReactNode;
  }) => {
    const tokens = code.split('\n').map(line => [{ type: 'plain', content: line }]);
    return children({
      className: `language-${language}`,
      style: { backgroundColor: '#1e1e1e' },
      tokens,
      getLineProps: () => ({}),
      getTokenProps: ({ token }) => ({ children: token.content }),
    });
  },
  themes: {
    vsDark: { plain: { backgroundColor: '#1e1e1e' } },
    vsLight: { plain: { backgroundColor: '#ffffff' } },
  },
}));

// Mock clipboard API
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock matchMedia
const mockMatchMedia = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockMatchMedia.mockReturnValue({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  window.matchMedia = mockMatchMedia;
});

describe('CodeBlock', () => {
  describe('rendering', () => {
    it('renders code content', () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      expect(screen.getByText('const x = 1;')).toBeInTheDocument();
    });

    it('renders multiline code', () => {
      const code = `function hello() {
  return "world";
}`;
      render(<CodeBlock className="language-javascript">{code}</CodeBlock>);

      expect(screen.getByText('function hello() {')).toBeInTheDocument();
      expect(screen.getByText('return "world";')).toBeInTheDocument();
      expect(screen.getByText('}')).toBeInTheDocument();
    });

    it('displays language badge for known languages', () => {
      render(<CodeBlock className="language-python">print("hello")</CodeBlock>);

      expect(screen.getByText('python')).toBeInTheDocument();
    });

    it('does not display language badge for plain text', () => {
      render(<CodeBlock>some text</CodeBlock>);

      expect(screen.queryByText('text')).not.toBeInTheDocument();
    });

    it('extracts language from className', () => {
      render(<CodeBlock className="language-typescript">const x: number = 1;</CodeBlock>);

      expect(screen.getByText('typescript')).toBeInTheDocument();
    });
  });

  describe('copy button', () => {
    it('renders copy button', () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      expect(screen.getByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    });

    it('shows "Copy" text initially', () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      expect(screen.getByText('Copy')).toBeInTheDocument();
    });

    it('copies code to clipboard when clicked', async () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      expect(mockWriteText).toHaveBeenCalledWith('const x = 1;');
    });

    it('shows "Copied!" after clicking', async () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      expect(await screen.findByText('Copied!')).toBeInTheDocument();
    });

    it('resets to "Copy" after timeout', async () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      const copyButton = screen.getByRole('button', { name: 'Copy code' });
      fireEvent.click(copyButton);

      // Wait for "Copied!" to appear
      expect(await screen.findByText('Copied!')).toBeInTheDocument();

      // Wait for timeout to reset back to "Copy"
      expect(await screen.findByText('Copy', {}, { timeout: 3000 })).toBeInTheDocument();
    });
  });

  describe('theme', () => {
    it('uses dark theme when prefers-color-scheme is dark', () => {
      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      const pre = screen.getByText('const x = 1;').closest('pre');
      expect(pre).toHaveStyle({ backgroundColor: '#1e1e1e' });
    });

    it('listens for color scheme changes', () => {
      const addEventListenerMock = vi.fn();
      const removeEventListenerMock = vi.fn();

      mockMatchMedia.mockReturnValue({
        matches: true,
        addEventListener: addEventListenerMock,
        removeEventListener: removeEventListenerMock,
      });

      const { unmount } = render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      expect(addEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));

      unmount();

      expect(removeEventListenerMock).toHaveBeenCalledWith('change', expect.any(Function));
    });
  });

  describe('styling', () => {
    it('adds extra padding when language badge is shown', () => {
      render(<CodeBlock className="language-javascript">const x = 1;</CodeBlock>);

      const pre = screen.getByText('const x = 1;').closest('pre');
      expect(pre).toHaveClass('pt-8');
    });

    it('does not add extra padding for plain text', () => {
      render(<CodeBlock>plain text</CodeBlock>);

      const pre = screen.getByText('plain text').closest('pre');
      expect(pre).not.toHaveClass('pt-8');
    });
  });
});
