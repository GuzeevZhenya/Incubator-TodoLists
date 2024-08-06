import { todolistsAPI, TodolistType } from "api/todolists-api";
import { appActions, RequestStatusType } from "app/app.reducer";
import { handleServerAppError, handleServerNetworkError } from "utils/error-utils";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { clearTasksAndTodolists } from "common/actions/common.actions";
import { createAppAsyncThunk } from "utils/createAppAsyncThunk";

const initialState: TodolistDomainType[] = [];

export const fetchTodolists = createAppAsyncThunk<{ todolists: TodolistType[] }, undefined>(
  "todo/fetch",
  async (param, thunkApi) => {
    const { dispatch, rejectWithValue } = thunkApi;
    dispatch(appActions.setAppStatus({ status: "loading" }));
    try {
      const res = await todolistsAPI.getTodolists();
      dispatch(appActions.setAppStatus({ status: "succeeded" }));
      return { todolists: res.data };
    } catch (error) {
      handleServerNetworkError(error, dispatch);
      return rejectWithValue(null);
    }
  },
);

export const removeTodolists = createAppAsyncThunk<any, any>("todo/remove", async (id: string, thunkApi) => {
  const { dispatch, rejectWithValue } = thunkApi;

  try {
    dispatch(appActions.setAppStatus({ status: "loading" }));
    dispatch(todolistsActions.changeTodolistEntityStatus({ id, entityStatus: "loading" }));
    const res = await todolistsAPI.deleteTodolist(id);
    if (res.data.resultCode === 0) {
      dispatch(appActions.setAppStatus({ status: "succeeded" }));
    } else {
      handleServerAppError(res.data, dispatch);
      return rejectWithValue(null);
    }
  } catch (error) {
    handleServerNetworkError(error, dispatch);
    return rejectWithValue(null);
  }
});

export const addTodolists = createAppAsyncThunk<{ todolist: TodolistType }, string>(
  "todo/add",
  async (title, thunkApi) => {
    const { dispatch, rejectWithValue } = thunkApi;
    dispatch(appActions.setAppStatus({ status: "loading" }));
    try {
      const res = await todolistsAPI.createTodolist(title);
      if (res.data.resultCode === 0) {
        dispatch(appActions.setAppStatus({ status: "succeeded" }));
        return { todolist: res.data.data.item };
      } else {
        handleServerAppError(res.data, dispatch);
        return rejectWithValue(null);
      }
    } catch (error) {
      handleServerNetworkError(error, dispatch);
      return rejectWithValue(null);
    }
  },
);

const slice = createSlice({
  name: "todo",
  initialState,
  reducers: {
    changeTodolistTitle: (state, action: PayloadAction<{ id: string; title: string }>) => {
      const todo = state.find((todo) => todo.id === action.payload.id);
      if (todo) {
        todo.title = action.payload.title;
      }
    },
    changeTodolistFilter: (state, action: PayloadAction<{ id: string; filter: FilterValuesType }>) => {
      const todo = state.find((todo) => todo.id === action.payload.id);
      if (todo) {
        todo.filter = action.payload.filter;
      }
    },
    changeTodolistEntityStatus: (state, action: PayloadAction<{ id: string; entityStatus: RequestStatusType }>) => {
      const todo = state.find((todo) => todo.id === action.payload.id);
      if (todo) {
        todo.entityStatus = action.payload.entityStatus;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(clearTasksAndTodolists, () => {
      return [];
    });
    builder.addCase(fetchTodolists.fulfilled, (state, action) => {
      console.log(action);
      return action.payload.todolists.map((tl) => ({ ...tl, filter: "all", entityStatus: "idle" }));
    });
    builder.addCase(removeTodolists.fulfilled, (state, action) => {
      const index = state.findIndex((todo) => todo.id === action.payload.id);
      if (index !== -1) state.splice(index, 1);
    });
    builder.addCase(addTodolists.fulfilled, (state, action) => {
      const newTodolist: TodolistDomainType = { ...action.payload.todolist, filter: "all", entityStatus: "idle" };
      state.unshift(newTodolist);
    });
  },
});

export const changeTodolistTitle = createAppAsyncThunk<{}, any>(
  `${slice.name}/changeTodolistTitle`,
  async (arg: { id: string; title: string }, thunkAPI) => {
    const { dispatch, rejectWithValue } = thunkAPI;
    try {
      dispatch(appActions.setAppStatus({ status: "loading" }));
      const res = await todolistsAPI.updateTodolist(arg.id, arg.title);
      if (res.data.resultCode === 0) {
        dispatch(appActions.setAppStatus({ status: "succeeded" }));
        return arg;
      } else {
        handleServerAppError(res.data, dispatch);
        return rejectWithValue(null);
      }
    } catch (error) {
      handleServerNetworkError(error, dispatch);
      return rejectWithValue(null);
    }
  },
);

export const todolistsReducer = slice.reducer;
export const todolistsActions = slice.actions;
export const todolistsThunk = { fetchTodolists, removeTodolists, addTodolists, changeTodolistTitle };

// thunks

// types
export type FilterValuesType = "all" | "active" | "completed";
export type TodolistDomainType = TodolistType & {
  filter: FilterValuesType;
  entityStatus: RequestStatusType;
};
