import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';

describe('基础测试环境', () => {
  test('测试环境是否正常工作', () => {
    expect(true).toBe(true);
  });

  test('DOM测试是否正常工作', () => {
    render(<div data-testid="test-element">测试内容</div>);
    const element = screen.getByTestId('test-element');
    expect(element).toBeInTheDocument();
    expect(element).toHaveTextContent('测试内容');
  });
});