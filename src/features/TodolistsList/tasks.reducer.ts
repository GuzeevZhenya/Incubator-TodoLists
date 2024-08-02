import { TaskPriorities, TaskStatuses, TaskType, todolistsAPI, UpdateTaskModelType } from "api/todolists-api";
import { AppDispatch, AppRootStateType, AppThunk } from "app/store";
import { handleServerAppError, handleServerNetworkError } from "utils/error-utils";
import { appActions } from "app/app.reducer";
import { todolistsActions } from "features/TodolistsList/todolists.reducer";
import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { clearTasksAndTodolists } from "common/actions/common.actions";
import { createAppAsyncThunk } from "utils/createAppAsyncThunk";

const initialState: TasksStateType = {};

const fetchTasks = createAsyncThunk<
  { tasks: TaskType[]; todolistId: string },
  string,
  { state: AppRootStateType; dispatch: AppDispatch; rejectValue: null }
>("tasks/fetchTasks", async (todolistId: string, apiThunk) => {
  const { dispatch, rejectWithValue } = apiThunk;
  try {
    dispatch(appActions.setAppStatus({ status: "loading" }));
    const res = await todolistsAPI.getTasks(todolistId);
    const tasks = res.data.items;
    dispatch(appActions.setAppStatus({ status: "succeeded" }));
    return { tasks, todolistId };
  } catch (error: any) {
    handleServerAppError(error, dispatch);
    return rejectWithValue(null);
  }
});

const removeTask = createAppAsyncThunk<{ todolistId: string; taskId: string }, { todolistId: string; taskId: string }>(
  "tasks/removeTasks",
  async (params: { taskId: string; todolistId: string }, thunkApi) => {
    const { dispatch, rejectWithValue } = thunkApi;
    try {
      const res = await todolistsAPI.deleteTask(params.todolistId, params.taskId);
      return { todolistId: params.todolistId, taskId: params.taskId };
    } catch (error: any) {
      handleServerAppError(error, dispatch);
      return rejectWithValue(null);
    }
  },
);

const addTask = createAppAsyncThunk<{ task: TaskType }, { title: string; todolistId: string }>(
  "tasks/addTasks",
  async (params: { title: string; todolistId: string }, thunkApi) => {
    const { dispatch } = thunkApi;
    thunkApi.dispatch(appActions.setAppStatus({ status: "loading" }));
    try {
      const res = await todolistsAPI.createTask(params.todolistId, params.title);
      if (res.data.resultCode === 0) {
        const task = res.data.data.item;
        dispatch(appActions.setAppStatus({ status: "succeeded" }));
        return { task };
      } else {
        handleServerAppError(res.data, dispatch);
        return thunkApi.rejectWithValue(res.data);
      }
    } catch (error: any) {
      thunkApi.dispatch(appActions.setAppStatus({ status: "failed" }));
      return thunkApi.rejectWithValue({ error: error.message });
    }
  },
);

const slice = createSlice({
  name: "tasks",
  initialState,
  reducers: {
    updateTask: (
      state,
      action: PayloadAction<{
        taskId: string;
        model: UpdateDomainTaskModelType;
        todolistId: string;
      }>,
    ) => {
      const tasks = state[action.payload.todolistId];
      const index = tasks.findIndex((t) => t.id === action.payload.taskId);
      if (index !== -1) {
        tasks[index] = { ...tasks[index], ...action.payload.model };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(todolistsActions.addTodolist, (state, action) => {
        state[action.payload.todolist.id] = [];
      })
      .addCase(todolistsActions.removeTodolist, (state, action) => {
        delete state[action.payload.id];
      })
      .addCase(todolistsActions.setTodolists, (state, action) => {
        action.payload.todolists.forEach((tl) => {
          state[tl.id] = [];
        });
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state[action.payload.todolistId] = action.payload.tasks;
      })
      .addCase(removeTask.fulfilled, (state, action: PayloadAction<{ taskId: string; todolistId: string }>) => {
        const tasks = state[action.payload.todolistId];
        const index = tasks.findIndex((t) => t.id === action.payload.taskId);
        if (index !== -1) tasks.splice(index, 1);
      })
      .addCase(addTask.fulfilled, (state, action: PayloadAction<{ task: TaskType }>) => {
        const tasks = state[action.payload.task.todoListId];
        tasks.unshift(action.payload.task);
      })
      .addCase(clearTasksAndTodolists, () => {
        return {};
      });
  },
});

type updateTaskType = { taskId: string; domainModel: UpdateDomainTaskModelType; todolistId: string };

const updateTask = createAppAsyncThunk<updateTaskType, updateTaskType>(
  `${slice.name}/updateTask`,
  async (arg, thunkApi) => {
    const { dispatch, rejectWithValue, getState } = thunkApi;

    try {
      const state = getState();
      const task = state.tasks[arg.todolistId].find((t) => t.id === arg.taskId);
      if (!task) {
        //throw new Error("task not found in the state");
        console.warn("task not found in the state");
        return rejectWithValue(null);
      }

      const apiModel: UpdateTaskModelType = {
        deadline: task.deadline,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        title: task.title,
        status: task.status,
        ...arg.domainModel,
      };

      const res = await todolistsAPI.updateTask(arg.todolistId, arg.taskId, apiModel);

      if (res.data.resultCode === 0) {
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

export const tasksReducer = slice.reducer;
export const tasksActions = slice.actions;
export const tasksThunk = { fetchTasks, removeTask, addTask, updateTask };

// thunks

// types
export type UpdateDomainTaskModelType = {
  title?: string;
  description?: string;
  status?: TaskStatuses;
  priority?: TaskPriorities;
  startDate?: string;
  deadline?: string;
};
export type TasksStateType = {
  [key: string]: Array<TaskType>;
};
