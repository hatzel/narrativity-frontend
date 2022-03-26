// Schemas for books for which we have pre computed events
import { Expose } from "class-transformer";

export class Book {
    @Expose()
    id: string
    @Expose()
    author: string
    @Expose()
    title: string
    @Expose()
    releaseYear: string

    constructor(id: string, author: string, title: string, releaseYear: string) {
        this.id = id;
        this.author = author;
        this.title = title;
        this.releaseYear = releaseYear;
    }
}
