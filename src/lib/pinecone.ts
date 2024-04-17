import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
import { downloadFromS3 } from "./s3-server";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import md5 from "md5";
import {
  Document,
  RecursiveCharacterTextSplitter
} from "@pinecone-database/doc-splitter";
import { getEmbeddings } from "./embeddings";
import { convertToAscii } from "./utils";

export const getPineconeClient = () => {
  return new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!
  });
};
// export const getPineconeClient = async () => {
//   if (!pinecone) {
//     pinecone = new PineconeClient();
//     await pinecone.init({
//       environment: process.env.PINECONE_ENVIRONMENT!,
//       apiKey: process.env.PINECONE_API_KEY!
//     });
//   }
//   return pinecone;
// };

type PDFPage = {
  pageContent: string;
  metadata: {
    loc: { pageNumber: number };
  };
};
export async function loadS3IntoPinecone(fileKey: string) {
  // Download the pdf and read
  console.log("Downloading s3 in file system");
  const file_name = await downloadFromS3(fileKey);
  if (!file_name) {
    throw new Error("Could not download from s3");
  }
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) as PDFPage[];

  // Split and segment the pdf in documents
  const documents = await Promise.all(pages.map(prepareDocument));
  console.log("DOCUMENTS========", documents);
  // Vectorise and embed individual docs
  const vectors = await Promise.all(documents.flat().map(embedDocument));

  // Upload the vector embeddings to pinecone
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatpdf");

  console.log("inserting vectors into pinecone");
  const namespace = pineconeIndex.namespace(convertToAscii(fileKey));
  await namespace.upsert(vectors);

  return documents[0];
}
async function embedDocument(doc: Document) {
  try {
    console.log("doc.pageContent=======", doc.pageContent.replace(/\n/g, " "));
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber
      }
    } as PineconeRecord;
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}
export const truncateStringByBytes = (str: string, bytes: number) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};
async function prepareDocument(page: PDFPage) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");

  // Split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000)
      }
    })
  ]);
  return docs;
}
