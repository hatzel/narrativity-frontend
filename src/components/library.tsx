/// Library of books with pre-computed event annotations
import { runInAction } from "mobx";
import { MobXProviderContext, observer } from "mobx-react";
import React from "react";
import DataTable from "react-data-table-component";
import { Book } from "../schemas/book";
import { AnnotationStore, UiStore } from "../stores";


interface LibraryProps {
    books: Book[],
    uiStore: UiStore,
    annotationStore: AnnotationStore,
}


const columnsBuilder = (clickCallback: React.MouseEventHandler<HTMLButtonElement>) => [
    {
        name: "Title",
        selector: (row: Book) => {
            return row.title;
        },
        sortable: true,
    },
    {
        name: "Author",
        selector: (row: Book) => {
            return row.author;
        },
        sortable: true,
    },
    {
        name: "Release Year",
        selector: (row: Book) => {
            return row.releaseYear || "-";
        },
        sortable: true,
    },
    {
        cell: () => <button onClick={clickCallback} className="tableButton">Load</button>,
        button: true,
    }
];

const paginationOptions = {
    noRowsPerPage: true,
}


@observer
export default class Library extends React.Component<LibraryProps, any> {
    render() {
        let filteredBooks = this.props.books.filter((book: Book) => {
            let searchQuery = this.props.uiStore.librarySearchText.toLowerCase()
            if this.props.uiStore.librarySearchText !== "" {
                return (
                    book.title.toLowerCase().includes(searchQuery) ||
                    book.author.toLowerCase().includes(searchQuery) ||
                    (book.releaseYear || "").toLowerCase().includes(searchQuery)
                )
            } else {
                return true;
            }
        })
        return <div className="library">
            <Filter uiStore={this.props.uiStore}/>
                <div className="listContainer">
                <DataTable
                    pagination
                    columns={columnsBuilder(async (event: React.MouseEvent<HTMLButtonElement>) => {
                        let rowId: string | undefined = (event.target as HTMLButtonElement).parentElement?.parentElement?.id;
                        if rowId !== undefined {
                            let dataId = rowId.substring(4)
                            runInAction(() => {
                                this.props.uiStore.loading = true;
                            })
                            this.props.annotationStore.fetchPrecomputedAnnotations(dataId, this.props.uiStore).then(() => {
                                runInAction(() => {
                                    this.props.uiStore.loading = false;
                                });
                            });
                        } else {
                            console.warn("Unable to find button's parents")
                        }
                    }) }
                    data={filteredBooks}
                    paginationComponentOptions={paginationOptions}
                />
                </div>
            </div>
    }
}


interface FilterProps {
    uiStore: UiStore
};

@observer
class Filter extends React.Component<FilterProps, any> {
    valueChange = (event: React.ChangeEvent<HTMLInputElement>) {
        runInAction(() {
            this.props.uiStore.librarySearchText = event.target.value;
        });
    }

    render() {

        return <div className="searchRow">
            <div>
                <label>Search d-Prose:</label>
            </div>
            <div>
                <input
                    id="librarySearch"
                    type="text"
                    placeholder="Title, Author or Year"
                    value={this.props.uiStore.librarySearchText}
                    onChange={this.valueChange}
                />
            </div>
        </div>
    }
}