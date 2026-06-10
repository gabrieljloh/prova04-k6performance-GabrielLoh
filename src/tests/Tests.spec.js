import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/latest/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import http from 'k6/http';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const getBooksListDuration = new Trend('get_books_list', true);
export const getBookByISBNDuration = new Trend('get_book_by_isbn', true);
export const RateContentOK = new Rate('content_OK');

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.30'],
    get_books_list: ['p(99)<2000'],
    get_book_by_isbn: ['p(99)<2000'],
    content_OK: ['rate>0.95']
  },
  stages: [
    { duration: '10s', target: 10 },
    { duration: '15s', target: 30 },
    { duration: '10s', target: 15 }
  ]
};

export function handleSummary(data) {
  return {
    './src/output/index.html': htmlReport(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true })
  };
}

const BASE_URL = 'https://demoqa.com';

const PARAMS = {
  headers: {
    'Content-Type': 'application/json'
  }
};

const OK = 200;

// ISBN de um livro existente na API
const SAMPLE_ISBN = '9781449325862';

export default function () {
  // GET /BookStore/v1/Books - lista todos os livros
  const resList = http.get(`${BASE_URL}/BookStore/v1/Books`, PARAMS);

  getBooksListDuration.add(resList.timings.duration);
  RateContentOK.add(resList.status === OK);

  check(resList, {
    'GET Books List - Status 200': r => r.status === OK,
    'GET Books List - Body has books': r => {
      const body = JSON.parse(r.body);
      return body.books && body.books.length > 0;
    }
  });

  // GET /BookStore/v1/Book?ISBN={isbn} - busca livro por ISBN
  const resBook = http.get(
    `${BASE_URL}/BookStore/v1/Book?ISBN=${SAMPLE_ISBN}`,
    PARAMS
  );

  getBookByISBNDuration.add(resBook.timings.duration);
  RateContentOK.add(resBook.status === OK);

  check(resBook, {
    'GET Book by ISBN - Status 200': r => r.status === OK,
    'GET Book by ISBN - Body has isbn': r => {
      const body = JSON.parse(r.body);
      return body.isbn === SAMPLE_ISBN;
    }
  });
}
